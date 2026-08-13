import { PageHeading } from "@/components/page-heading";
import { PostingForm } from "@/components/posting-form";

export default function NewPostingPage() {
  return (
    <div className="page-stack">
      <PageHeading title="Yeni ilan" description="İlan hemen yayımlanır." />
      <PostingForm />
    </div>
  );
}
