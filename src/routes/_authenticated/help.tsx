import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Nav } from "@/components/site/Nav";
import { listMyTickets, createTicket, isHumanOnline } from "@/lib/support.functions";
import { Plus, MessageCircle, Loader2, Circle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/help")({
  head: () => ({ meta: [{ title: "Help & Support — ShortForge AI" }] }),
  component: HelpPage,
});

function HelpPage() {
  const listFn = useServerFn(listMyTickets);
  const onlineFn = useServerFn(isHumanOnline);
  const createFn = useServerFn(createTicket);
  const qc = useQueryClient();
  const [subject, setSubject] = useState("");
  const seededRef = useRef(false);

  const tickets = useQuery({ queryKey: ["my-tickets"], queryFn: () => listFn(), refetchInterval: 8000 });
  const online = useQuery({ queryKey: ["human-online"], queryFn: () => onlineFn(), refetchInterval: 30000 });

  const create = useMutation({
    mutationFn: (s: string) => createFn({ data: { subject: s || "Support request" } }),
    onSuccess: ({ id }) => {
      setSubject("");
      qc.invalidateQueries({ queryKey: ["my-tickets"] });
      window.location.assign(`/help/${id}`);
    },
    onError: (e: any) => toast.error(e?.message ?? "Couldn't create ticket"),
  });

  // Auto-create first ticket if user has none
  useEffect(() => {
    if (tickets.data && tickets.data.length === 0 && !seededRef.current && !create.isPending) {
      seededRef.current = true;
      create.mutate("Support request");
    }
  }, [tickets.data, create]);

  return (
    <div className="min-h-screen pt-24 pb-24 px-6">
      <Nav />
      <div className="max-w-4xl mx-auto">
        <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold">Help & <span className="text-gradient">Support</span></h1>
            <p className="text-muted-foreground mt-1 text-sm">Chat with our AI assistant or talk to a human.</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Circle className={`size-2.5 ${online.data?.online ? "fill-emerald-400 text-emerald-400" : "fill-zinc-500 text-zinc-500"}`} />
            <span className="text-muted-foreground">{online.data?.online ? "Staff online now" : "No staff online — AI + ticket"}</span>
          </div>
        </div>

        <div className="glass rounded-2xl p-5 mb-6 border border-border/40">
          <div className="font-display font-semibold mb-3">Start a new ticket</div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="What do you need help with?"
              className="flex-1 rounded-lg bg-background/60 border border-border/60 px-3 py-2 text-sm"
              maxLength={200}
            />
            <button
              onClick={() => create.mutate(subject)}
              disabled={create.isPending}
              className="btn-hero rounded-lg px-4 py-2 text-sm inline-flex items-center gap-2 disabled:opacity-50"
            >
              {create.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              New chat
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Your tickets</div>
          {tickets.isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
          {tickets.data?.map((t) => (
            <Link
              key={t.id}
              to="/help/$ticketId"
              params={{ ticketId: t.id }}
              className="glass rounded-xl p-4 flex items-center justify-between hover:border-[var(--neon)]/40 border border-border/40 transition-colors block"
            >
              <div className="flex items-center gap-3 min-w-0">
                <MessageCircle className="size-4 text-[var(--neon)] shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{t.subject}</div>
                  <div className="text-xs text-muted-foreground">{new Date(t.last_message_at).toLocaleString()}</div>
                </div>
              </div>
              <StatusBadge status={t.status} />
            </Link>
          ))}
          {tickets.data && tickets.data.length === 0 && !create.isPending && (
            <div className="text-sm text-muted-foreground">No tickets yet — opening your first chat…</div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
    live: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    closed: "bg-rose-500/20 text-rose-300 border-rose-500/30",
  };
  return <span className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded border ${styles[status] ?? styles.open}`}>{status}</span>;
}
