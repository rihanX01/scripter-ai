import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listAnnouncements, createAnnouncement, toggleAnnouncement, deleteAnnouncement } from "@/lib/admin.functions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/announcements")({ component: Page });

function Page() {
  const list = useServerFn(listAnnouncements);
  const create = useServerFn(createAnnouncement);
  const toggle = useServerFn(toggleAnnouncement);
  const del = useServerFn(deleteAnnouncement);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["announcements"], queryFn: () => list() });

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [variant, setVariant] = useState<"info" | "success" | "warning" | "promo">("info");

  const refresh = () => qc.invalidateQueries({ queryKey: ["announcements"] });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await create({ data: { title, body, variant, active: true } });
    toast.success("Announcement published");
    setTitle(""); setBody(""); refresh();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Announcements</h1>
        <p className="text-muted-foreground mt-1">Broadcast site-wide messages.</p>
      </div>

      <Card className="glass-strong p-5 border-border/40">
        <form onSubmit={submit} className="space-y-3">
          <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} required/></div>
          <div><Label>Body</Label><Textarea value={body} onChange={(e) => setBody(e.target.value)} required rows={3}/></div>
          <div className="flex items-end gap-3">
            <div className="flex-1"><Label>Variant</Label>
              <Select value={variant} onValueChange={(v) => setVariant(v as any)}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="promo">Promo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="btn-hero rounded-lg">Publish</Button>
          </div>
        </form>
      </Card>

      <div className="space-y-3">
        {isLoading && <div className="text-muted-foreground">Loading…</div>}
        {data?.map((a: any) => (
          <Card key={a.id} className="glass-strong p-4 border-border/40 flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs uppercase tracking-wider px-2 py-0.5 rounded glass">{a.variant}</span>
                <span className="font-display font-semibold">{a.title}</span>
              </div>
              <div className="text-sm text-muted-foreground">{a.body}</div>
              <div className="text-xs text-muted-foreground mt-1">{new Date(a.created_at).toLocaleString()}</div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={a.active} onCheckedChange={async (v) => { await toggle({ data: { id: a.id, active: v } }); refresh(); }}/>
              <Button size="icon" variant="ghost" onClick={async () => { await del({ data: { id: a.id } }); toast.success("Deleted"); refresh(); }}>
                <Trash2 className="size-4"/>
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
