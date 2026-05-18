import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { adminListTickets, adminGetTicket, adminSendMessage, adminSetStatus } from "@/lib/support.functions";
import { supabase } from "@/integrations/supabase/client";
import { Send, Loader2, UserCircle2, Bot, Headphones, MessageCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/support")({
  head: () => ({ meta: [{ title: "Support inbox — Admin" }] }),
  component: SupportInbox,
});

function SupportInbox() {
  const listFn = useServerFn(adminListTickets);
  const [selected, setSelected] = useState<string | null>(null);
  const qc = useQueryClient();

  const tickets = useQuery({ queryKey: ["admin-tickets"], queryFn: () => listFn(), refetchInterval: 5000 });

  useEffect(() => {
    const ch = supabase.channel("admin-support")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, () => qc.invalidateQueries({ queryKey: ["admin-tickets"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "support_messages" }, () => {
        qc.invalidateQueries({ queryKey: ["admin-tickets"] });
        if (selected) qc.invalidateQueries({ queryKey: ["admin-ticket", selected] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc, selected]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl font-bold">Support Inbox</h1>
        <p className="text-muted-foreground text-sm">Customer chats. Reply to open or live tickets. Your presence (last 2 min) marks you as online to users.</p>
      </div>
      <div className="grid md:grid-cols-[320px_1fr] gap-4 h-[calc(100vh-12rem)]">
        <div className="glass-strong border border-border/40 rounded-2xl overflow-y-auto">
          {tickets.isLoading && <div className="p-4 text-sm text-muted-foreground">Loading…</div>}
          {tickets.data?.map((t: any) => (
            <button
              key={t.id}
              onClick={() => setSelected(t.id)}
              className={`w-full text-left p-3 border-b border-border/40 hover:bg-white/5 ${selected === t.id ? "bg-[var(--neon)]/10" : ""}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium truncate flex items-center gap-2">
                  <MessageCircle className="size-3.5 text-[var(--neon)]" />
                  {t.user?.display_name || t.user?.email || "User"}
                </div>
                <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded ${t.status === "live" ? "bg-emerald-500/20 text-emerald-300" : t.status === "closed" ? "bg-rose-500/20 text-rose-300" : "bg-zinc-500/20 text-zinc-300"}`}>{t.status}</span>
              </div>
              <div className="text-xs text-muted-foreground truncate mt-1">{t.subject}</div>
              <div className="text-[10px] text-muted-foreground mt-1">{new Date(t.last_message_at).toLocaleString()}</div>
            </button>
          ))}
          {tickets.data && tickets.data.length === 0 && <div className="p-4 text-sm text-muted-foreground">No tickets yet.</div>}
        </div>

        {selected ? <ConversationPane ticketId={selected} /> : (
          <div className="glass-strong border border-border/40 rounded-2xl flex items-center justify-center text-sm text-muted-foreground">
            Select a ticket to view the conversation.
          </div>
        )}
      </div>
    </div>
  );
}

function ConversationPane({ ticketId }: { ticketId: string }) {
  const getFn = useServerFn(adminGetTicket);
  const sendFn = useServerFn(adminSendMessage);
  const statusFn = useServerFn(adminSetStatus);
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const q = useQuery({ queryKey: ["admin-ticket", ticketId], queryFn: () => getFn({ data: { ticket_id: ticketId } }) });

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [q.data?.messages.length]);

  const send = useMutation({
    mutationFn: (b: string) => sendFn({ data: { ticket_id: ticketId, body: b } }),
    onSuccess: () => { setText(""); qc.invalidateQueries({ queryKey: ["admin-ticket", ticketId] }); qc.invalidateQueries({ queryKey: ["admin-tickets"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Send failed"),
  });

  const setStatus = useMutation({
    mutationFn: (s: "open" | "live" | "closed") => statusFn({ data: { ticket_id: ticketId, status: s } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-ticket", ticketId] }); qc.invalidateQueries({ queryKey: ["admin-tickets"] }); },
  });

  return (
    <div className="glass-strong border border-border/40 rounded-2xl flex flex-col overflow-hidden">
      <div className="border-b border-border/40 px-4 py-3 flex items-center justify-between flex-wrap gap-2">
        <div className="min-w-0">
          <div className="font-medium truncate">{q.data?.profile?.display_name || q.data?.profile?.email || "User"}</div>
          <div className="text-xs text-muted-foreground truncate">{q.data?.profile?.email} · plan: {q.data?.profile?.plan}</div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={q.data?.ticket?.status ?? "open"}
            onChange={(e) => setStatus.mutate(e.target.value as any)}
            className="text-xs bg-background/60 border border-border/60 rounded-md px-2 py-1"
          >
            <option value="open">open</option>
            <option value="live">live</option>
            <option value="closed">closed</option>
          </select>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {q.isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
        {q.data?.messages.map((m: any) => <Bubble key={m.id} m={m} />)}
      </div>

      <div className="border-t border-border/40 p-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (text.trim()) send.mutate(text.trim()); } }}
          placeholder="Reply as staff — this takes the ticket live."
          rows={2}
          className="w-full bg-transparent outline-none text-sm resize-none"
          maxLength={4000}
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={() => text.trim() && send.mutate(text.trim())}
            disabled={send.isPending || !text.trim()}
            className="btn-hero rounded-lg px-4 py-1.5 text-sm inline-flex items-center gap-2 disabled:opacity-50"
          >
            {send.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Send
          </button>
        </div>
      </div>
    </div>
  );
}

function Bubble({ m }: { m: any }) {
  if (m.sender_type === "user") {
    return (
      <div className="flex items-start gap-2">
        <UserCircle2 className="size-5 text-muted-foreground mt-1" />
        <div className="max-w-[80%]">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">User</div>
          <div className="text-sm whitespace-pre-wrap rounded-2xl rounded-tl-sm bg-white/5 px-3 py-2">{m.body}</div>
        </div>
      </div>
    );
  }
  const isAdmin = m.sender_type === "admin";
  const Icon = isAdmin ? Headphones : Bot;
  return (
    <div className="flex items-start gap-2 justify-end">
      <div className="max-w-[80%]">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 text-right">{isAdmin ? "You (staff)" : "AI"}</div>
        <div className={`text-sm whitespace-pre-wrap rounded-2xl rounded-tr-sm px-3 py-2 ${isAdmin ? "bg-emerald-500/20" : "bg-[var(--neon)]/15"}`}>{m.body}</div>
      </div>
      <div className={`size-7 rounded-full flex items-center justify-center ${isAdmin ? "bg-emerald-500/20 text-emerald-300" : "bg-[var(--neon)]/15 text-[var(--neon)]"}`}>
        <Icon className="size-4" />
      </div>
    </div>
  );
}
