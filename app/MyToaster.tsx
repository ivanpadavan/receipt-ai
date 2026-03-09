import { Toaster } from "@/components/ui/sonner";

export const MyToaster = () => <Toaster
  style={{ pointerEvents: "auto" }}
  position={"top-center"}
  richColors={false}
  visibleToasts={1}
/>