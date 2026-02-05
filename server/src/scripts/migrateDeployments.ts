import fs from "fs";
import path from "path";
import csv from "csv-parser";
import ExcelJS from "exceljs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface MigrationRow {
    Date?: string | Date;
    Timestamp?: string | Date;
    "Shop Name": string;
    "Item Type"?: string;
    "Used Spare parts"?: string;
    "Staff Name"?: string;
    Remark?: string;
    Reamarks?: string;
}

async function readExcel(filePath: string): Promise<MigrationRow[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0]; // Assuming first sheet
    const results: MigrationRow[] = [];

    // Get headers from first row
    const headers: string[] = [];
    worksheet.getRow(1).eachCell((cell, colNumber) => {
        headers[colNumber] = cell.value?.toString().trim() || "";
    });

    console.log("Detected Headers:", headers.filter(Boolean));

    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header

        const rowData: any = {};
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            const header = headers[colNumber];
            if (header) {
                // Handle dates specifically if exceljs parsed them as Date objects
                rowData[header] = cell.value;
            }
        });

        if (rowNumber === 2) {
            console.log("Sample Data Row 2:", rowData);
        }

        results.push(rowData as MigrationRow);
    });

    return results;
}

async function readCSV(filePath: string): Promise<MigrationRow[]> {
    const results: MigrationRow[] = [];
    return new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(csv())
            .on("data", (data) => results.push(data))
            .on("end", () => resolve(results))
            .on("error", reject);
    });
}

async function migrate() {
    const filePath = process.argv[2];
    if (!filePath) {
        console.error("Please provide a path to the file (CSV or XLSX): npx ts-node src/scripts/migrateDeployments.ts <file>");
        process.exit(1);
    }

    const ext = path.extname(filePath).toLowerCase();
    let results: MigrationRow[] = [];

    console.log(`🔍 Reading ${ext.toUpperCase()} and validating data...`);

    if (ext === ".xlsx") {
        results = await readExcel(filePath);
    } else if (ext === ".csv") {
        results = await readCSV(filePath);
    } else {
        console.error("Unsupported file extension. Please use .csv or .xlsx");
        process.exit(1);
    }

    // 2. Fetch all mappings to resolve IDs
    const users = await prisma.user.findMany();
    const shops = await prisma.shop.findMany();
    const items = await prisma.inventoryItem.findMany();

    const userMap = new Map(users.map((u) => [u.name.toLowerCase().trim(), u.id]));
    const shopMap = new Map(shops.map((s) => [s.name.toLowerCase().trim(), s.id]));
    const itemMap = new Map(items.map((i) => [i.name.toLowerCase().trim(), i.id]));

    const deploymentData: any[] = [];
    const errors: string[] = [];

    // 3. Resolve and Validate
    results.forEach((row, index) => {
        const rowNum = index + 2; // +1 for index, +1 for header

        // Name Aliasing Maps
        const itemAliasMap: Record<string, string> = {
            "remax chargers": "remax charger",
            "remax charger": "remax charger",
            "remax micro cable": "micro cable",
            "charging cable": "charging cable",
            "m-power": "battery",
        };

        const shopAliasMap: Record<string, string> = {
            "a bank": "abank ho1",
            "dnnm": "daw nyein nyein mar",
            "g0107": "g0107f",
        };

        // Normalize names for mapping
        const userName = (row["Staff Name"] || "Nyein Nyein Soe")?.toString().toLowerCase().trim();
        const rawShopName = (row["Shop Name"] || "Unknown Shop")?.toString().toLowerCase().trim();
        const shopName = shopAliasMap[rawShopName] || rawShopName;

        const rawItemName = (row["Used Spare parts"] || row["Item Type"] || "Unknown Item")?.toString().toLowerCase().trim();
        const itemName = itemAliasMap[rawItemName] || rawItemName;

        const userId = userMap.get(userName);
        const shopId = shopMap.get(shopName);
        const itemId = itemMap.get(itemName);

        if (!userId) errors.push(`Row ${rowNum}: User "${userName}" not found.`);
        if (!shopId) errors.push(`Row ${rowNum}: Shop "${row["Shop Name"] || "Unknown"}" not found.`);
        const itemDisplayName = row["Used Spare parts"] || row["Item Type"] || "Unknown";
        if (!itemId) errors.push(`Row ${rowNum}: Item "${itemDisplayName}" not found.`);

        if (userId && shopId && itemId) {
            const remarkVal = row.Remark || row.Reamarks || "";
            const remarkText = remarkVal ? `[MIGRATED] ${remarkVal}` : "[MIGRATED]";
            const dateVal = row.Date || row.Timestamp || new Date();
            deploymentData.push({
                usedAt: new Date(dateVal as any),
                salespersonId: userId,
                shopId: shopId,
                inventoryItemId: itemId,
                remarks: remarkText,
            });
        }
    });

    if (errors.length > 0) {
        console.error("❌ Validation failed. Migration aborted to prevent data corruption:");
        errors.forEach((err) => console.error(err));
        console.log("\nTotal Errors:", errors.length);
        process.exit(1);
    }

    console.log(`✅ Validation passed. Preparing to migrate ${deploymentData.length} records...`);

    // 4. Atomic Transaction
    try {
        await prisma.$transaction(async (tx) => {
            console.log("⚡ Executing transaction...");
            for (const data of deploymentData) {
                await tx.usage.create({ data });
            }
        });
        console.log("🎉 Migration successful! All records have been imported.");
    } catch (error) {
        console.error("❌ Transaction failed. Rolling back all changes.", error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

migrate().catch((err) => {
    console.error("Fatal error during migration:", err);
    process.exit(1);
});
