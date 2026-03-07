import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Send, Loader2, MessageSquare, Reply, Trash2 } from "lucide-react";
import { useAuth } from "../lib/auth";

const API_BASE = import.meta.env.VITE_API_BASE || atob("aHR0cHM6Ly9rb21pa3ZlcnNlLWFwaS1hbWJlci52ZXJjZWwuYXBwL2FwaQ==");
const COMMENT_BASE = API_BASE.replace(/\/api\/?$/, "/api");

interface CommentItem {
  id: number;
  content: string;
  comic_slug: string;
  chapter_slug?: string;
  parent_id?: number;
  created_at: string;
  user: { id: number; username: string; avatar_url?: string; role?: string };
  replies?: CommentItem[];
}

export default function CommentSection({ comicSlug }: { comicSlug: string }) {
  const { user, token } = useAuth();
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: number; username: string } | null>(null);
  const [replyText, setReplyText] = useState("");
  const [posting, setPosting] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const loadComments = () => {
    fetch(`${COMMENT_BASE}/comments?comic_slug=${encodeURIComponent(comicSlug)}`)
      .then((r) => r.json())
      .then((d) => setComments(d.comments || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadComments(); }, [comicSlug]); // eslint-disable-line

  const postComment = async (content: string, parentId?: number) => {
    if (!content.trim() || !token) return;
    setPosting(true);
    try {
      const res = await fetch(`${COMMENT_BASE}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ comic_slug: comicSlug, content: content.trim(), parent_id: parentId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengirim komentar");
      setText("");
      setReplyText("");
      setReplyTo(null);
      loadComments();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal mengirim komentar");
    } finally {
      setPosting(false);
    }
  };

  const deleteComment = async (id: number) => {
    if (!confirm("Hapus komentar ini?")) return;
    await fetch(`${COMMENT_BASE}/comments?id=${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    loadComments();
  };

  return (
    <section className="mt-6">
      <h2 className="font-display text-base text-white/85 font-bold flex items-center gap-2 mb-4">
        <MessageSquare size={16} className="text-[#f97316]" />
        Komentar
        {comments.length > 0 && (
          <span className="text-[10px] text-[#5c5c6e] font-body font-normal">({comments.length})</span>
        )}
      </h2>

      {/* Comment Form */}
      {user ? (
        <div className="mb-5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[#f97316]/20 flex items-center justify-center text-[#f97316] text-xs font-bold font-body shrink-0 mt-0.5">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <textarea
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Tulis komentar..."
                rows={2}
                maxLength={1000}
                className="w-full px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm font-body text-white placeholder-[#5c5c6e] focus:outline-none focus:border-[#f97316]/30 transition-colors resize-none"
              />
              <div className="flex justify-end mt-1.5">
                <button
                  onClick={() => postComment(text)}
                  disabled={posting || !text.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f97316] text-white text-xs font-body font-medium hover:bg-[#ea580c] transition-colors disabled:opacity-50"
                >
                  {posting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                  Kirim
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-5 p-4 rounded-lg bg-white/[0.02] border border-white/[0.04] text-center">
          <p className="text-xs text-[#8e8ea0] font-body">
            <Link to="/login" className="text-[#f97316] hover:underline font-medium">Masuk</Link> atau{" "}
            <Link to="/register" className="text-[#f97316] hover:underline font-medium">Daftar</Link> untuk berkomentar
          </p>
        </div>
      )}

      {/* Comments List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 size={20} className="text-[#f97316] animate-spin" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-[#5c5c6e] font-body text-center py-6">Belum ada komentar. Jadilah yang pertama!</p>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <CommentBubble
              key={c.id}
              comment={c}
              currentUser={user}
              onReply={(id, username) => { setReplyTo({ id, username }); setReplyText(""); }}
              onDelete={deleteComment}
              replyTo={replyTo}
              replyText={replyText}
              setReplyText={setReplyText}
              posting={posting}
              onPostReply={(content, parentId) => postComment(content, parentId)}
              onCancelReply={() => setReplyTo(null)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function CommentBubble({
  comment,
  currentUser,
  onReply,
  onDelete,
  replyTo,
  replyText,
  setReplyText,
  posting,
  onPostReply,
  onCancelReply,
}: {
  comment: CommentItem;
  currentUser: { id: number; username: string; role: string } | null;
  onReply: (id: number, username: string) => void;
  onDelete: (id: number) => void;
  replyTo: { id: number; username: string } | null;
  replyText: string;
  setReplyText: (v: string) => void;
  posting: boolean;
  onPostReply: (content: string, parentId: number) => void;
  onCancelReply: () => void;
}) {
  const canDelete = currentUser && (currentUser.id === comment.user.id || currentUser.role === "admin");
  const isReplying = replyTo?.id === comment.id;

  return (
    <div>
      <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/[0.01] transition-colors">
        <div className="w-7 h-7 rounded-full bg-[#f97316]/20 flex items-center justify-center text-[#f97316] text-[10px] font-bold font-body shrink-0 mt-0.5">
          {comment.user.username.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-body font-medium text-white/85">{comment.user.username}</span>
            <span className="text-[10px] text-[#5c5c6e] font-body">
              {new Date(comment.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>
          <p className="text-xs text-[#c0c0d0] font-body leading-relaxed whitespace-pre-wrap break-words">{comment.content}</p>
          <div className="flex items-center gap-2 mt-1.5">
            {currentUser && (
              <button onClick={() => onReply(comment.id, comment.user.username)} className="flex items-center gap-1 text-[10px] font-body text-[#5c5c6e] hover:text-[#f97316] transition-colors">
                <Reply size={11} /> Balas
              </button>
            )}
            {canDelete && (
              <button onClick={() => onDelete(comment.id)} className="flex items-center gap-1 text-[10px] font-body text-[#5c5c6e] hover:text-red-400 transition-colors">
                <Trash2 size={11} /> Hapus
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Reply form */}
      {isReplying && (
        <div className="ml-10 mt-1 mb-2 flex items-start gap-2">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder={`Balas @${comment.user.username}...`}
            rows={2}
            maxLength={1000}
            className="flex-1 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs font-body text-white placeholder-[#5c5c6e] focus:outline-none focus:border-[#f97316]/30 transition-colors resize-none"
            autoFocus
          />
          <div className="flex flex-col gap-1">
            <button
              onClick={() => onPostReply(replyText, comment.id)}
              disabled={posting || !replyText.trim()}
              className="px-2.5 py-1.5 rounded-lg bg-[#f97316] text-white text-[10px] font-body font-medium hover:bg-[#ea580c] disabled:opacity-50 transition-colors"
            >
              {posting ? <Loader2 size={10} className="animate-spin" /> : "Kirim"}
            </button>
            <button onClick={onCancelReply} className="px-2.5 py-1.5 rounded-lg text-[10px] font-body text-[#5c5c6e] hover:text-white bg-white/[0.04] transition-colors">
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Nested replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-6 border-l border-white/[0.04] pl-4 space-y-1">
          {comment.replies.map((reply) => (
            <CommentBubble
              key={reply.id}
              comment={reply}
              currentUser={currentUser}
              onReply={onReply}
              onDelete={onDelete}
              replyTo={replyTo}
              replyText={replyText}
              setReplyText={setReplyText}
              posting={posting}
              onPostReply={onPostReply}
              onCancelReply={onCancelReply}
            />
          ))}
        </div>
      )}
    </div>
  );
}
