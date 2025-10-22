import Link from 'next/link';

interface MentionsTextProps {
  content: string;
  mentions?: Array<{
    id: string;
    mentioned_user?: { id: string; full_name: string };
    mentioned_org?: { org_id: string; name: string };
  }>;
}

export function MentionsText({ content, mentions = [] }: MentionsTextProps) {
  if (!mentions.length) {
    return <p className="whitespace-pre-wrap">{content}</p>;
  }

  // Create map of mentions for quick lookup
  const userMentions = new Map(
    mentions
      .filter(m => m.mentioned_user)
      .map(m => [m.mentioned_user!.full_name.toLowerCase(), m.mentioned_user!])
  );

  const orgMentions = new Map(
    mentions
      .filter(m => m.mentioned_org)
      .map(m => [m.mentioned_org!.name.toLowerCase(), m.mentioned_org!])
  );

  // Parse content and replace mentions with links
  const parts = content.split(/(@\w+)/g);

  return (
    <p className="whitespace-pre-wrap">
      {parts.map((part, index) => {
        if (part.startsWith('@')) {
          const name = part.slice(1).toLowerCase();
          const user = userMentions.get(name);
          const org = orgMentions.get(name);

          if (user) {
            return (
              <Link
                key={index}
                href={`/users/${user.id}`}
                className="text-primary hover:underline font-medium"
              >
                {part}
              </Link>
            );
          }

          if (org) {
            return (
              <Link
                key={index}
                href={`/organizations/${org.org_id}`}
                className="text-primary hover:underline font-medium"
              >
                {part}
              </Link>
            );
          }
        }

        return <span key={index}>{part}</span>;
      })}
    </p>
  );
}
