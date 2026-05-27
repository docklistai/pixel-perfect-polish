import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      position="top-right"
      toastOptions={{
        classNames: {
          toast: "toast",
          success: "success",
          error: "error",
          warning: "warn",
          info: "info",
          title: "toast-title",
          description: "toast-body",
          actionButton: "btn primary sm",
          cancelButton: "btn ghost sm",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
