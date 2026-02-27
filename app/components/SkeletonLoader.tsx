export function SkeletonCard() {
  return (
    <div className="animate-pulse bg-white rounded-lg shadow-sm p-5 border-l-4 border-slate-200">
      {/* Top area with badge */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-200 rounded"></div>
          <div className="space-y-2">
            <div className="h-5 w-32 bg-slate-200 rounded"></div>
          </div>
        </div>
        <div className="h-6 w-20 bg-slate-200 rounded"></div>
      </div>
      
      {/* Details */}
      <div className="space-y-2 mb-4">
        <div className="h-4 w-full bg-slate-200 rounded"></div>
        <div className="h-4 w-24 bg-slate-200 rounded"></div>
      </div>
      
      {/* Buttons */}
      <div className="flex gap-2 pt-4 border-t border-slate-100">
        <div className="flex-1 h-10 bg-slate-200 rounded"></div>
        <div className="h-10 w-10 bg-slate-200 rounded"></div>
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-4 py-3">
                <div className="h-4 w-8 bg-slate-200 rounded"></div>
              </th>
              <th className="px-4 py-3">
                <div className="h-4 w-32 bg-slate-200 rounded"></div>
              </th>
              <th className="px-4 py-3">
                <div className="h-4 w-24 bg-slate-200 rounded"></div>
              </th>
              <th className="px-4 py-3">
                <div className="h-4 w-16 bg-slate-200 rounded"></div>
              </th>
              <th className="px-4 py-3">
                <div className="h-4 w-20 bg-slate-200 rounded"></div>
              </th>
              <th className="px-4 py-3">
                <div className="h-4 w-20 bg-slate-200 rounded"></div>
              </th>
            </tr>
          </thead>
          <tbody>
            {[...Array(rows)].map((_, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  <div className="h-4 w-8 bg-slate-200 rounded"></div>
                </td>
                <td className="px-4 py-3">
                  <div className="h-4 w-full bg-slate-200 rounded"></div>
                </td>
                <td className="px-4 py-3">
                  <div className="h-4 w-full bg-slate-200 rounded"></div>
                </td>
                <td className="px-4 py-3">
                  <div className="h-4 w-12 bg-slate-200 rounded"></div>
                </td>
                <td className="px-4 py-3">
                  <div className="h-6 w-20 bg-slate-200 rounded"></div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <div className="h-8 w-16 bg-slate-200 rounded"></div>
                    <div className="h-8 w-8 bg-slate-200 rounded"></div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
