import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Nav } from "@/components/site/Nav";
import { getTicket, sendUserMessage, isHumanOnline } from "@/lib/support.functions";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Send, Loader2, UserCircle2, Bot, Headphones, Circle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/help/$ticketId")({
  head: () => ({ meta: [{ title: "Support chat — ShortForge AI" }] }),
  component: TicketPage,
});

function TicketPage() {
  const { ticketId } = Route.useParams();
  const getFn = useServerFn(getTicket);
  const sendFn = useServerFn(sendUserMessage);
  const onlineFn = useServerFn(isHumanOnline);
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const q = useQuery({ queryKey: ["ticket", ticketId], queryFn: () => getFn({ data: { ticket_id: ticketId } }) });
  const online = useQuery({ queryKey: ["human-online"], queryFn: () => onlineFn(), refetchInterval: 30000 });

  // Realtime
  useEffect(() => {
    const ch = supabase.channel(`ticket-${ticketId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "support_messages", filter: `ticket_id=eq.${ticketId}` }, () => {
        qc.invalidateQueries({ queryKey: ["ticket", ticketId] });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "support_tickets", filter: `id=eq.${ticketId}` }, () => {
        qc.invalidateQueries({ queryKey: ["ticket", ticketId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [ticketId, qc]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    inputRef.current?.focus();
  }, [q.data?.messages.length]);

  const send = useMutation({
    mutationFn: (vars: { body: string; request_human?: boolean }) =>
      sendFn({ data: { ticket_id: ticketId, body: vars.body, request_human: vars.request_human } }),
    onSuccess: () => { setText(""); qc.invalidateQueries({ queryKey: ["ticket", ticketId] }); inputRef.current?.focus(); },
    onError: (e: any) => toast.error(e?.message ?? "Send failed"),
  });

  const messages = q.data?.messages ?? [];
  const status = q.data?.ticket?.status ?? "open";

  return (
    <div className="min-h-screen pt-24 pb-6 px-4">
      <Nav />
      <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-7rem)]">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <Link to="/help" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="size-3.5" /> All tickets
          </Link>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-muted-foreground">{q.data?.ticket?.subject}</span>
            <span className="flex items-center gap-1.5">
              <Circle className={`size-2 ${online.data?.online ? "fill-emerald-400 text-emerald-400" : "fill-zinc-500 text-zinc-500"}`} />
              <span className="text-muted-foreground">{online.data?.online ? "Staff online" : "AI mode"}</span>
            </span>
            <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded border border-border/60">{status}</span>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto glass rounded-2xl p-4 space-y-4 border border-border/40">
          {q.isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
          {messages.map((m: any) => <Bubble key={m.id} m={m} />)}
          {send.isPending && status !== "live" && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Bot className="size-3.5" /> AI is thinking…</div>
          )}
        </div>

        {status === "closed" ? (
          <div className="mt-3 text-xs text-muted-foreground text-center">This ticket is closed. Open a new one from the Help page.</div>
        ) : (
          <div className="mt-3 glass rounded-2xl p-3 border border-border/40">
            <textarea
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (text.trim()) send.mutate({ body: text.trim() }); }
              }}
              placeholder={status === "live" ? "Type a message to staff…" : "Ask the AI anything about ShortForge…"}
              rows={2}
              className="w-full bg-transparent outline-none text-sm resize-none"
              maxLength={4000}
            />
            <div className="flex items-center justify-between mt-2 gap-2 flex-wrap">
              {status !== "live" ? (
                <button
                  onClick={() => text.trim() ? send.mutate({ body: text.trim(), request_human: true }) : send.mutate({ body: "I'd like to talk to a human, please.", request_human: true })}
                  disabled={send.isPending}
                  className="text-xs px-3 py-1.5 rounded-lg border border-border/60 hover:border-[var(--neon)]/50 inline-flex items-center gap-1.5"
                >
                  <Headphones className="size-3.5" /> Talk to a human
                </button>
              ) : <span className="text-xs text-emerald-400">Live with staff</span>}
              <button
                onClick={() => text.trim() && send.mutate({ body: text.trim() })}
                disabled={send.isPending || !text.trim()}
                className="btn-hero rounded-lg px-4 py-1.5 text-sm inline-flex items-center gap-2 disabled:opacity-50"
              >
                {send.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Send
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Bubble({ m }: { m: any }) {
  if (m.sender_type === "user") {
    return (
      <div className="flex items-start gap-2 justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-4 py-2 text-sm whitespace-pre-wrap">{m.body}</div>
        <UserCircle2 className="size-5 text-muted-foreground mt-1" />
      </div>
    );
  }
  const isAdmin = m.sender_type === "admin";
  const Icon = isAdmin ? Headphones : Bot;
  const label = isAdmin ? "Staff" : "AI";
  return (
    <div className="flex items-start gap-2">
      <div className={`size-7 rounded-full flex items-center justify-center ${isAdmin ? "bg-emerald-500/20 text-emerald-300" : "bg-[var(--neon)]/15 text-[var(--neon)]"}`}>
        <Icon className="size-4" />
      </div>
      <div className="max-w-[80%]">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{label}</div>
        <div className="text-sm whitespace-pre-wrap text-foreground/90">{m.body}</div>
      </div>
    </div>
  );
}
