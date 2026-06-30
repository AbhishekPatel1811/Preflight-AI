import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PRODUCT_NAME } from "@/lib/brand";
import { Reveal } from "./Reveal";

export function CTASection() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <Reveal className="mx-auto max-w-4xl rounded-lg border border-border bg-card p-8 text-center shadow-soft sm:p-12">
        <p className="text-sm font-semibold uppercase text-info">Next launch</p>
        <h2 className="mt-3 text-3xl font-bold text-foreground sm:text-4xl">Get a clearer launch read before the next meeting.</h2>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          Paste the rough idea. Let {PRODUCT_NAME} turn it into a readiness score, top fixes, and a launch pack your team can work from.
        </p>
        <div className="mt-8 flex justify-center">
          <Button asChild size="lg">
            <Link href="/app">
              Generate {PRODUCT_NAME} report
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </Reveal>
    </section>
  );
}
