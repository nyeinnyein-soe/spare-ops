import { RequestStatus } from "../types";

export default function StatusBadge({ status }: { status: RequestStatus }) {
  const styles = {
    [RequestStatus.PENDING]: "bg-amber-100 text-amber-700 border-amber-200",
    [RequestStatus.APPROVED]:
      "bg-emerald-100 text-emerald-700 border-emerald-200",
    [RequestStatus.REJECTED]: "bg-rose-100 text-rose-700 border-rose-200",
    [RequestStatus.RECEIVED]: "bg-indigo-100 text-indigo-700 border-indigo-200",
  };
  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border tracking-widest shadow-sm ${styles[status]}`}
    >
      {status}
    </span>
  );
}
