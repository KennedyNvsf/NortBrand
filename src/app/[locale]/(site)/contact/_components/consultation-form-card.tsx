import { enterItem } from "@/components/motion/reveal-item";
import { ConsultationForm } from "@/features/consultation/components/consultation-form";

/*
 * Figma Contact › Form Card (278:114, tablet 378:134, mobile 378:353). The card is a
 * server-rendered shell with the hero's entrance; the form inside is the only client
 * boundary on the page (src/features/consultation, #39).
 */
export function ConsultationFormCard() {
  return (
    <div
      {...enterItem(3)}
      id="consultation"
      data-form-slot="consultation"
      className="relative flex flex-col rounded-lg border border-border-default bg-bg-surface p-6 shadow-card md:p-8 lg:w-140 lg:shrink-0 lg:p-9"
    >
      <ConsultationForm />
    </div>
  );
}
