"use client";

import { Markdown } from "@tiptap/markdown";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Pilcrow,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export function AnnouncementEditor({ initial = "" }: { initial?: string }) {
  const [markdown, setMarkdown] = useState(initial);
  const [mode, setMode] = useState<"visual" | "markdown">("visual");
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, Markdown],
    content: initial,
    contentType: "markdown",
    onUpdate: ({ editor }) => setMarkdown(editor.getMarkdown()),
    editorProps: {
      attributes: {
        class: "min-h-64 p-4 focus:outline-none prose-content",
        "aria-label": "Duyuru içeriği",
        "aria-multiline": "true",
        role: "textbox",
      },
    },
  });
  function switchMode(next: string) {
    if (next !== "visual" && next !== "markdown") return;
    if (next === "visual")
      editor?.commands.setContent(markdown, { contentType: "markdown" });
    setMode(next);
  }
  return (
    <Tabs
      value={mode}
      onValueChange={switchMode}
      className="gap-0 rounded-lg border bg-background"
    >
      <input type="hidden" name="markdown" value={markdown} />
      <div className="flex flex-wrap items-center justify-between gap-2 border-b p-2">
        <TabsList>
          <TabsTrigger value="visual">Görsel</TabsTrigger>
          <TabsTrigger value="markdown">Markdown</TabsTrigger>
        </TabsList>
        {mode === "visual" && (
          <div
            className="flex gap-1"
            role="toolbar"
            aria-label="Metin biçimlendirme"
          >
            <Button
              type="button"
              size="icon-sm"
              variant={editor?.isActive("paragraph") ? "secondary" : "ghost"}
              onClick={() => editor?.chain().focus().setParagraph().run()}
              aria-label="Paragraf"
            >
              <Pilcrow />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant={
                editor?.isActive("heading", { level: 2 })
                  ? "secondary"
                  : "ghost"
              }
              onClick={() =>
                editor?.chain().focus().toggleHeading({ level: 2 }).run()
              }
              aria-label="Başlık"
            >
              <Heading2 />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant={editor?.isActive("bold") ? "secondary" : "ghost"}
              onClick={() => editor?.chain().focus().toggleBold().run()}
              aria-label="Kalın"
            >
              <Bold />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant={editor?.isActive("italic") ? "secondary" : "ghost"}
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              aria-label="İtalik"
            >
              <Italic />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant={editor?.isActive("bulletList") ? "secondary" : "ghost"}
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              aria-label="Madde listesi"
            >
              <List />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant={editor?.isActive("orderedList") ? "secondary" : "ghost"}
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              aria-label="Numaralı liste"
            >
              <ListOrdered />
            </Button>
          </div>
        )}
      </div>
      <TabsContent value="visual">
        <EditorContent editor={editor} />
      </TabsContent>
      <TabsContent value="markdown">
        <Textarea
          className="min-h-64 resize-y rounded-none border-0 font-mono"
          value={markdown}
          onChange={(event) => setMarkdown(event.target.value)}
          aria-label="Markdown içeriği"
        />
      </TabsContent>
    </Tabs>
  );
}
