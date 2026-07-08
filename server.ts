import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const SYSTEM_INSTRUCTION_BASE = `
    আপনি 'মাদরাসাতুস সুন্নাহ'-এর একজন অত্যন্ত দক্ষ, বিচক্ষণ এবং অভিজ্ঞ শিক্ষক। আপনি শিক্ষার্থীদের জন্য একটি অত্যন্ত কার্যকর, সুশৃঙ্খল এবং বুদ্ধিদীপ্ত পাঠ পরিকল্পনা (Lesson Plan) ও রুটিন তৈরি করবেন।

    **শ্রেণির কাজ (C.W) ও বাড়ির কাজ (H.W) সমন্বয় ও সৃজনশীলতার নিয়ম (CW & HW Combined Daily Routine):**
    ১. **সমন্বিত শিখন (Combined Learning):** প্রতিটি দিনের C.W (শ্রেণির কাজ) এবং H.W (বাড়ির কাজ) অবশ্যই একে অপরের সাথে সরাসরি সম্পর্কিত এবং পরিপূরক হতে হবে। শ্রেণির কাজ (C.W)-এ যা শিখানো হবে বা আলোচনা করা হবে, বাড়ির কাজ (H.W)-এ তা খাতা বা বোর্ডে লেখার মাধ্যমে, মুখস্থ করার মাধ্যমে বা কোনো ব্যবহারিক কাজের মাধ্যমে শক্তিশালী করা হবে।
    ২. **একঘেয়েমি এড়ানো ও বৈচিত্র্যময় ভাষার ব্যবহার:** C.W এবং H.W কলামে কখনোই শুধু "মনোযোগ দিয়ে পড়ো", "রিডিং পড়ো" বা "Read carefully" শব্দগুলো বারবার বা একনাগাড়ে ব্যবহার করবেন না। এটি অত্যন্ত ক্লান্তিকর ও বিরক্তিকর। এর পরিবর্তে সৃজনশীল, আনন্দদায়ক ও বৈচিত্র্যময় ভাষা এবং বাস্তবমুখী কাজ দিন।
    ৩. **দিন নম্বরের ব্যবহার সম্পূর্ণ নিষিদ্ধ (NO Day-number prefixes):** প্রতিটি দিনের কাজ শুরু করতে কখনোই কোনো দিন নম্বর বা দিন নির্দেশক শব্দ (যেমন: "১ম দিন:", "২য় দিন:", "১ম দিন -", "প্রথম দিন", "Day 1" ইত্যাদি) ব্যবহার করবেন না। কন্টেন্টের শুরুতে সরাসরি কাজের নির্দেশ দিয়ে শুরু করুন। কারণ টেবিলে বা ডায়েরিতে এমনিতেই তারিখ ও ক্রমানুসারে তালিকা থাকবে, তাই টেক্সটের ভেতরে দিন নম্বর লিখে জায়গা অপচয় বা পুনরাবৃত্তি করার কোনো প্রয়োজন নেই।
    ৪. **বাধ্যতামূলক সাধারণ অনুজ্ঞাসূচক আদেশ বা নির্দেশ (Direct Imperative Commands):** প্রতিটি কাজ অবশ্যই অনুজ্ঞাসূচক বাক্যে (Imperative Sentences) সরাসরি আদেশ বা নির্দেশ আকারে লিখতে হবে। ক্রিয়াপদ অবশ্যই সরাসরি সাধারণ আদেশসূচক রূপে থাকবে (যেমন: 'করো', 'লেখো', 'পড়ো', 'আলোচনা করো', 'মুখস্থ করো', 'প্রস্তুত করো', 'সম্পাদন করো')। কখনোই সম্মানসূচক বা উচ্চ-মধ্যম পুরুষ রূপ (যেমন: 'করুন', 'লিখুন', 'পড়ুন', 'আলোচনা করুন', 'মুখস্থ করুন', 'প্রস্তুত করুন') ব্যবহার করবেন না।
    
    *শ্রেণীর কাজের (C.W) বৈচিত্র্যময় সুন্দর উদাহরণ (আদেশসূচক অনুজ্ঞাবাচক রূপে এবং দিন নম্বর ছাড়া):* 
    - "অমুক অধ্যায়টি সরবে পাঠ করো এবং ৩টি গুরুত্বপূর্ণ পয়েন্ট চিহ্নিত করে ব্ল্যাকবোর্ডে লেখো, পৃষ্ঠা-৬০।"
    - "মূল ভাববস্তু ও হাদিসের শিক্ষা নিয়ে সহপাঠীদের সাথে শ্রেণিকক্ষে গ্রুপ আলোচনা করো, পৃষ্ঠা-৬২।"
    - "বিষয়ের অন্তর্গত প্রধান ধারণাগুলো বোর্ডে সুন্দর করে লিখে শিক্ষকের ব্যাখ্যা শোনো ও বোঝো, পৃষ্ঠা-৬৫।"
    - "সংক্ষিপ্ত প্রশ্নোত্তর ও কঠিন শব্দগুলোর বানান বোর্ডে অনুশীলন করো এবং ছোট কুইজে অংশ নাও, পৃষ্ঠা-৬৭।"
    - "সম্পূর্ণ বিষয়টির ওপর পুনরালোচনা (Revision) করো ও যেকোনো ২টি প্রশ্ন বোর্ডে লিখে উত্তর দাও, পৃষ্ঠা-৬৯।"

    *বাড়ির কাজের (H.W) বৈচিত্র্যময় সুন্দর উদাহরণ (C.W এর পরিপূরক, আদেশসূচক অনুজ্ঞাবাচক রূপে এবং দিন নম্বর ছাড়া):*
    - "শ্রেণিতে আলোচিত প্রধান বিষয়গুলো পুনরায় রিভিশন করে খাতায় সুন্দর হস্তাক্ষরে ৩টি পয়েন্ট লেখো, পৃষ্ঠা-৬০।"
    - "পাঠের মূল শিক্ষাগুলো অভিভাবককে মুখে বলো এবং খাতায় ১টি সৃজনশীল প্রশ্ন নিজের থেকে তৈরি করো, পৃষ্ঠা-৬২।"
    - "পাঠে উল্লেখিত সকল প্রাসঙ্গিক দলিল, আয়াত ও হাদিস মুখস্থ করে খাতায় না দেখে ১ বার সুন্দর করে লেখো, পৃষ্ঠা-৬৫।"
    - "অনুশীলনীর প্রধান প্রধান প্রশ্নের উত্তরগুলো খাতায় লিখে অভিভাবককে দেখিয়ে তাঁর স্বাক্ষর নাও, পৃষ্ঠা-৬৭।"
    - "পুরো অধ্যায়ের একটি সুন্দর সারসংক্ষেপ (Summary) খাতায় ৩টি বাক্যে লিখে প্রস্তুত করো, পৃষ্ঠা-৬৯।"

    **বুদ্ধিদীপ্ত ও প্রাসঙ্গিক দলিলের নিয়ম (Advanced Scriptural Rules):**
    ১. কোনো অধ্যায়ে একাধিক আয়াত বা হাদিসের দলিল থাকলে ছাত্রছাত্রীদের শুধুমাত্র একটি দলিল মুখস্থ করতে বলবেন না। অবশ্যই 'সকল' প্রাসঙ্গিক আয়াত বা দলিল মুখস্থ করার নির্দেশ দেবেন।
    - উদাহরণ: "বিষয়ের সাথে সম্পর্কিত সকল প্রাসঙ্গিক দলিল মুখস্থ করো।"
    ২. পৃষ্ঠা নম্বর বা রেফারেন্স অবশ্যই আদেশের একদম শেষে কমা দিয়ে বা ব্র্যাকেটে লিখবেন।
    - সঠিক উদাহরণ: "সালাতের গুরুত্বের ওপর আলোচনাটি পড়ো এবং মূল বিষয়বস্তু বোঝো, পৃষ্ঠা-৫৭।"
    - সঠিক উদাহরণ: "বিষয়ের প্রাসঙ্গিক সকল আয়াত ও দলিল মুখস্থ করো, পৃষ্ঠা-৬৬-৬৮।"

    **টেবিল ফরম্যাট (Strict Markdown):**
    | DATE | C.W | H.W | ACTION |
    | :--- | :--- | :--- | :--- |
    | [তারিখ] | [বার বা কাজ] | [বার বা কাজ] | [REGENERATE] |

    **কঠোর নিয়মাবলী:**
    ১. ACTION কলামে সবসময় "[REGENERATE]" শব্দটি লিখবেন।
    ২. কোনো ধরণের শুভেচ্ছা, ভূমিকা, কোড ব্লক (\`\`\`) বা অতিরিক্ত বর্ণনা লিখবেন না। শুধুমাত্র Markdown টেবিলটি প্রধান উত্তর হিসেবে থাকবে।
    ৩. যদি কোনো দিনে ক্লাস না থাকে (যেমন সাপ্তাহিক ছুটি বা অন্য কোনো বন্ধ), তবে "ছুটি" বা "ক্লাস নেই" লিখুন।
`;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Helper to initialize Gemini safely
  const getGeminiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in environment variables.");
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  };

  // API Route: Generate lesson plan stream
  app.post("/api/generate-lesson-plan", async (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const request = req.body;

    const sendEvent = (type: string, data: any) => {
      res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
    };

    try {
      const ai = getGeminiClient();
      sendEvent("progress", { progress: 10, message: "সিলেবাস এবং দিনের সংখ্যা বিশ্লেষণ করা হচ্ছে..." });

      let prompt = `
        শ্রেণি: ${request.gradeLevel}
        শুরুর তারিখ: ${request.startDate}
        দিনের সংখ্যা: ${request.duration} দিন
        পৃষ্ঠা সীমা: পৃষ্ঠা ${request.startPage} থেকে ${request.endPage}
        ${request.additionalContext ? `অতিরিক্ত নির্দেশাবলী: ${request.additionalContext}` : ''}
      `;

      if (request.extractedText) {
        prompt += `\nএখানে ফাইল থেকে সংগৃহীত সিলেবাসের বিবরণ দেওয়া হলো:\n${request.extractedText}\n`;
      }

      prompt += `
        নির্দেশ: পৃষ্ঠা ${request.startPage} থেকে ${request.endPage} এর বিষয়বস্তু বা সংগৃহীত সিলেবাসের বিবরণ বিশ্লেষণ করে ${request.duration} দিনের একটি নিট এন্ড ক্লিন Markdown টেবিল দিন। 
        - মুখস্থ করার আদেশের ক্ষেত্রে অবশ্যই "সকল" আয়াত বা দলিল মুখস্থ করার কথা উল্লেখ করবেন।
        - পৃষ্ঠা নম্বর বা রেফারেন্স অবশ্যই আদেশের শেষে লিখবেন। 
        - উল্টো ক্রমে (Reverse Order) সাজান।
        - ACTION কলামে "[REGENERATE]" লিখুন।
      `;

      const parts: any[] = [{ text: prompt }];
      if (request.fileData && request.mimeType && !request.extractedText) {
        parts.push({
          inlineData: {
            mimeType: request.mimeType,
            data: request.fileData.split(',')[1]
          }
        });
      }

      sendEvent("progress", { progress: 30, message: "বুদ্ধিদীপ্ত পাঠ পরিকল্পনা তৈরি করা হচ্ছে..." });

      const responseStream = await ai.models.generateContentStream({
        model: 'gemini-3.5-flash',
        contents: { parts: parts },
        config: {
          systemInstruction: SYSTEM_INSTRUCTION_BASE,
          temperature: 0.1,
        }
      });

      let fullText = "";
      for await (const chunk of responseStream) {
        const text = chunk.text || "";
        fullText += text;
        sendEvent("chunk", { text });
        const estimatedProgress = Math.min(95, 40 + Math.floor(fullText.length / 50));
        sendEvent("progress", { progress: estimatedProgress, message: "ডেটা প্রসেস করা হচ্ছে..." });
      }

      sendEvent("progress", { progress: 100, message: "সম্পন্ন!" });
      res.end();
    } catch (error: any) {
      console.error("Error in generate-lesson-plan endpoint:", error);
      sendEvent("error", { message: error.message || "রুটিন তৈরিতে সমস্যা হয়েছে।" });
      res.end();
    }
  });

  // API Route: Regenerate single day content
  app.post("/api/regenerate-day", async (req, res) => {
    const { request, date, previousContent } = req.body;

    try {
      const ai = getGeminiClient();
      const prompt = `
        শ্রেণি: ${request.gradeLevel}
        পৃষ্ঠা সীমা: পৃষ্ঠা ${request.startPage} থেকে ${request.endPage}
        তারিখ: ${date}
        পূর্ববর্তী কাজ ছিল: ${previousContent}

        নির্দেশ: উপরোক্ত তথ্যের ভিত্তিতে শুধুমাত্র এই ১ দিনের জন্য একটি ভিন্ন, সৃজনশীল এবং অত্যন্ত সুন্দর নতুন C.W (শ্রেণি কাজ) এবং H.W (শিক্ষার্থীর কাজ) তৈরি করুন। 
        - আগের কাজের চেয়ে এটি সম্পূর্ণ আলাদা হতে হবে।
        - কখনোই শুধু "মনোযোগ দিয়ে পড়ো" বা "Read carefully" লিখবেন না।
        - দিন নম্বর বা কোনো দিন নির্দেশক শব্দ (যেমন: "১ম দিন:", "২য় দিন:", "১ম দিন -", "প্রথম দিন", "Day 1" ইত্যাদি) ব্যবহার করবেন না।
        - প্রতিটি কাজ অবশ্যই অনুজ্ঞাসূচক বাক্যে (Imperative Sentences) সরাসরি সাধারণ আদেশ বা নির্দেশ আকারে লিখতে হবে। ক্রিয়াপদ অবশ্যই সরাসরি সাধারণ আদেশসূচক রূপে থাকবে (যেমন: 'করো', 'লেখো', 'পড়ো', 'আলোচনা করো', 'মুখস্থ করো', 'প্রস্তুত করো')। কখনোই সম্মানসূচক বা উচ্চ-মধ্যম পুরুষ রূপ (যেমন: 'করুন', 'লিখুন', 'পড়ুন', 'আলোচনা করুন') ব্যবহার করবেন না।
        - আদেশের মধ্যে বৈচিত্র্য আনুন (যেমন: খাতায় সুন্দর হস্তাক্ষরে লেখো, শ্রেণিকক্ষে সহপাঠীদের সাথে মূল পয়েন্ট আলোচনা করো, প্রাসঙ্গিক সকল আয়াত মুখস্থ করে খাতায় না দেখে লেখো, অভিভাবককে মুখে বলো এবং তাঁর স্বাক্ষর নাও)।
        - শ্রেণি ডায়েরি এবং হোমওয়ার্ক সুন্দর সমন্বিত কাজের রূপ দিন।
        - পৃষ্ঠা নম্বর বা সূরার রেফারেন্স অবশ্যই আদেশের একদম শেষে কমা বা ব্র্যাকেটে লিখবেন।
        - যদি কোনো প্রাসঙ্গিক আয়াত বা হাদিসের দলিল থাকে, তবে "সকল প্রাসঙ্গিক দলিল মুখস্থ করো" উল্লেখ করুন।
        
        ফলাফলটি শুধুমাত্র নিচের মতো JSON ফরম্যাটে দিন:
        { "cw": "...", "hw": "..." }
      `;

      const parts: any[] = [{ text: prompt }];
      if (request.fileData && request.mimeType) {
        parts.push({
          inlineData: {
            mimeType: request.mimeType,
            data: request.fileData.split(',')[1]
          }
        });
      }

      const result = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: { parts: parts },
        config: {
          systemInstruction: "আপনি একজন মাদরাসার অভিজ্ঞ শিক্ষক। আপনি শুধু এবং শুধুমাত্র JSON উত্তর দিন।",
          responseMimeType: "application/json"
        }
      });

      const parsed = JSON.parse(result.text || "{}");
      res.json(parsed);
    } catch (error: any) {
      console.error("Error in regenerate-day endpoint:", error);
      res.status(500).json({ error: error.message || "পুনরায় তৈরি করতে সমস্যা হয়েছে।" });
    }
  });

  // Serve static files in production / Vite middleware in dev
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
