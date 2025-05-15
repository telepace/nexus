import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SubmitButton({
  text,
  className,
}: { text: string; className?: string }) {
  const { pending } = useFormStatus();

  return (
    <Button
      className={cn("w-full relative overflow-hidden", className)}
      type="submit"
      disabled={pending}
    >
      {pending ? (
        <span className="flex items-center justify-center">
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          Processing...
        </span>
      ) : (
        <>
          <span className="absolute inset-0 flex items-center justify-center w-full h-full transition-all duration-300 ease-out transform translate-y-0 group-hover:translate-y-full">
            {text}
          </span>
          <span className="absolute inset-0 flex items-center justify-center w-full h-full transition-all duration-300 ease-out transform -translate-y-full group-hover:translate-y-0">
            {text}
          </span>
        </>
      )}
    </Button>
  );
}
