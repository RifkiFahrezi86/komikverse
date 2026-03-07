import { useEffect, useState } from "react";
import { Trash2, Loader2, MessageSquare } from "lucide-react";
import { useAuth } from "../../lib/auth";

const API_BASE = import.meta.env.VITE_API_BASE || atob("aHR0cHM6Ly9rb21pa3ZlcnNlLWFwaS1hbWJlci52ZXJjZWwuYXBwL2FwaQ==");
const ADMIN_BASE = API_BASE.replace(/\/api\/?$/, "/api");

interface Comment {
  id: number;
  content: string;
  username: string;
  comic_slug: string;
  created_at: string;
}

export default function AdminCommentsPage() {
  const { token } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);

  const loadComments = () => {
    setLoading(true);
    fetch(`${ADMIN_BASE}/admin/comments`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setComments(d.comments || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadComments(); }, []); // eslint-disable-line

  const deleteComment = async (id: number) => {
    if (!confirm("Hapus komentar ini?")) return;
    setActionId(id);
    try {
      await fetch(`${ADMIN_BASE}/admin/comments?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      loadComments();
    } finally {
      setActionId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display text-lg font-bold text-white/85 flex items-center gap-2">
          <MessageSquare size={20} className="text-[#f97316]" /> Kelola Komentar
        </h2>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="text-[#f97316] animate-spin" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-[#5c5c6e] font-body py-12 text-center">Tidak ada komentar</p>
      ) : (
        <div className="space-y-2">
          {comments.map((c) => (
            <div key={c.id} className="bg-[#12121a] rounded-xl border border-white/[0.04] p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#f97316]/20 flex items-center justify-center text-[#f97316] text-xs font-bold font-body shrink-0">
                  {c.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-body font-medium text-white/85">{c.username}</span>
                    <span className="text-[10px] text-[#5c5c6e] font-body">
                      {new Date(c.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                  <p className="text-xs text-[#8e8ea0] font-body mb-1">{c.content}</p>
                  <p className="text-[10px] text-[#5c5c6e] font-body">Komik: {c.comic_slug}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {actionId === c.id ? (
                    <Loader2 size={14} className="text-[#f97316] animate-spin" />
                  ) : (
                    <button onClick={() => deleteComment(c.id)} title="Hapus" className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
