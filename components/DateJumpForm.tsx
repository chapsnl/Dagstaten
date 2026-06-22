"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DateJumpForm({ defaultDate }: { defaultDate: string }) {
  const router = useRouter();
  const [date, setDate] = useState(defaultDate);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        router.push(`/dag/${date}`);
      }}
      className="flex items-end gap-3"
    >
      <div className="flex-1">
        <label className="field-label" htmlFor="date">
          Datum
        </label>
        <input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="field-input w-full"
        />
      </div>
      <button type="submit" className="btn-dark">
        Open dag
      </button>
    </form>
  );
}
