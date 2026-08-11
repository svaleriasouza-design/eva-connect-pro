import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function EvaMarkdown({ children }: { children: string }) {
  return (
    <div className="space-y-2 text-sm leading-relaxed [&_a]:underline [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_li]:ml-4 [&_li]:list-disc [&_ol_li]:list-decimal [&_strong]:font-semibold">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: (props) => (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs" {...props} />
            </div>
          ),
          th: (props) => <th className="border border-border bg-muted px-2 py-1 text-left font-medium" {...props} />,
          td: (props) => <td className="border border-border px-2 py-1 align-top" {...props} />,
          p: (props) => <p className="whitespace-pre-wrap" {...props} />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
