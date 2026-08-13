import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";

export function MemberAvatar({
  user,
  className,
}: {
  user: { name: string; image?: string | null };
  className?: string;
}) {
  return (
    <Avatar className={className}>
      <AvatarImage src={user.image ?? undefined} alt="" />
      <AvatarFallback>{initials(user.name)}</AvatarFallback>
    </Avatar>
  );
}
