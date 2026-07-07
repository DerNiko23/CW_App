"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { RejectReason } from "@/lib/inbox/constants";

function revalidateVideo(videoId: string) {
  revalidatePath("/");
  revalidatePath(`/videos/${videoId}`);
}

export async function acceptVideo(videoId: string): Promise<void> {
  const supabase = createAdminClient();

  const { error: updateError } = await supabase
    .from("videos")
    .update({ status: "accepted" })
    .eq("id", videoId);
  if (updateError) throw new Error(`Annehmen fehlgeschlagen: ${updateError.message}`);

  const { error: feedbackError } = await supabase
    .from("feedback")
    .insert({ video_id: videoId, action: "accept" });
  if (feedbackError) throw new Error(`Feedback konnte nicht gespeichert werden: ${feedbackError.message}`);

  revalidateVideo(videoId);
}

export async function rejectVideo(videoId: string, reason: RejectReason): Promise<void> {
  const supabase = createAdminClient();

  const { error: updateError } = await supabase
    .from("videos")
    .update({ status: "rejected" })
    .eq("id", videoId);
  if (updateError) throw new Error(`Ablehnen fehlgeschlagen: ${updateError.message}`);

  const { error: feedbackError } = await supabase
    .from("feedback")
    .insert({ video_id: videoId, action: "reject", reason });
  if (feedbackError) throw new Error(`Feedback konnte nicht gespeichert werden: ${feedbackError.message}`);

  revalidateVideo(videoId);
}

export async function markVideoDone(videoId: string): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("videos")
    .update({ status: "done", done_at: new Date().toISOString() })
    .eq("id", videoId);
  if (error) throw new Error(`Als erledigt markieren fehlgeschlagen: ${error.message}`);

  revalidateVideo(videoId);
}
