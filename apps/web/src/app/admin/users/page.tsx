"use client";

import { useEffect, useState } from "react";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  subscription: { planCode: string; status: string } | null;
  _count: { conversations: number; tasksCreated: number };
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);

  useEffect(() => {
    fetch("/api/admin/users")
      .then((res) => res.json())
      .then((data) => setUsers(data.users ?? []));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Pengguna</h1>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-white/50">
            <tr className="border-b border-white/10">
              <th className="py-2 pr-4">Nama</th>
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Paket</th>
              <th className="py-2 pr-4">Percakapan</th>
              <th className="py-2 pr-4">Tugas Dibuat</th>
              <th className="py-2 pr-4">Bergabung</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="py-2 pr-4 font-medium">
                  {u.name}{" "}
                  {u.role === "ADMIN" && (
                    <span className="ml-1 rounded bg-brand-400/10 px-1.5 py-0.5 text-[10px] text-brand-300">
                      admin
                    </span>
                  )}
                </td>
                <td className="py-2 pr-4 text-white/60">{u.email}</td>
                <td className="py-2 pr-4 text-white/60">
                  {u.subscription?.planCode ?? "free"}
                </td>
                <td className="py-2 pr-4">{u._count.conversations}</td>
                <td className="py-2 pr-4">{u._count.tasksCreated}</td>
                <td className="py-2 pr-4 text-white/50">
                  {new Date(u.createdAt).toLocaleDateString("id-ID")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
