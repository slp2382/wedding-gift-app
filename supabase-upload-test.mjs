import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const supabaseUrl = "https://vxtvjcdaugslqcdokllf.supabase.co";
const supabaseKey =eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4dHZqY2RhdWdzbHFjZG9rbGxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjUzNjE1MiwiZXhwIjoyMDc4MTEyMTUyfQ.gfUCKI7dyuKAdD_bDIHItd-Pa4Qf0TaFZFv34cE6y2o;     // IMPORTANT

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function testUpload() {
  // tiny 11-byte file
  const fileBuffer = Buffer.from("hello world");

  console.log("Starting upload...");

  const { data, error } = await supabase.storage
    .from("printfiles")
    .upload("cards/test_upload_probe.txt", fileBuffer, {
      contentType: "text/plain",
      upsert: true,
    });

  console.log("Upload finished");
  console.log("DATA:", data);
  console.log("ERROR:", error);
}

testUpload().catch(console.error);
