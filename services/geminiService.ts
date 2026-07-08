import { LessonPlanRequest } from "../types";

export const generateLessonPlanStream = async (
  request: LessonPlanRequest,
  onProgress: (progress: number, message: string) => void
): Promise<string> => {
  const response = await fetch("/api/generate-lesson-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "রুটিন তৈরিতে সমস্যা হয়েছে।");
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("স্ট্রিমিং শুরু করা যায়নি।");
  }

  const decoder = new TextDecoder("utf-8");
  let done = false;
  let accumulated = "";
  let buffer = "";

  while (!done) {
    const { value, done: doneReading } = await reader.read();
    done = doneReading;
    if (value) {
      buffer += decoder.decode(value, { stream: !done });
      const lines = buffer.split("\n");
      // Keep the last partial line in the buffer
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const jsonStr = line.slice(6).trim();
          if (jsonStr) {
            try {
              const data = JSON.parse(jsonStr);
              if (data.type === "progress") {
                onProgress(data.progress, data.message);
              } else if (data.type === "chunk") {
                accumulated += data.text;
              } else if (data.type === "error") {
                throw new Error(data.message || "রুটিন তৈরিতে সমস্যা হয়েছে।");
              }
            } catch (e: any) {
              if (e.message && e.message.includes("রুটিন তৈরিতে সমস্যা হয়েছে")) {
                throw e;
              }
              console.error("Error parsing stream chunk:", e);
            }
          }
        }
      }
    }
  }

  return accumulated;
};

export const regenerateDayContent = async (
  request: LessonPlanRequest,
  date: string,
  previousContent: string
): Promise<{ cw: string, hw: string }> => {
  const response = await fetch("/api/regenerate-day", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ request, date, previousContent })
  });

  if (!response.ok) {
    throw new Error("পুনরায় তৈরি করতে সমস্যা হয়েছে।");
  }

  return await response.json();
};
