"use client";

import { ClipboardCheck, Crosshair, Focus, ScanSearch } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PRODUCT_NAME } from "@/lib/brand";
import type { PreflightInput } from "@/lib/types";
import { getLaunchDateInputValue } from "@/lib/validators";

type FieldErrors = Partial<Record<keyof PreflightInput, string>>;

function GuidedStep({
  step,
  title,
  description,
  children
}: {
  step: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-background p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 flex-none items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
          {step}
        </span>
        <div>
          <h2 className="text-sm font-bold text-foreground">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function PreflightField({
  id,
  label,
  value,
  error,
  placeholder,
  onChange,
  multiline = false,
  type = "text",
  inputMode,
  autoComplete,
  min,
  required = false
}: {
  id: keyof PreflightInput;
  label: string;
  value: string;
  error?: string;
  placeholder: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  type?: string;
  inputMode?: "url";
  autoComplete?: string;
  min?: string;
  required?: boolean;
}) {
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required ? (
          <>
            <span data-required-marker="true" className="ml-1 text-destructive" aria-hidden="true">
              *
            </span>
            <span className="sr-only"> (required)</span>
          </>
        ) : null}
      </Label>
      {multiline ? (
        <Textarea
          id={id}
          className="min-h-24 resize-y"
          value={value}
          placeholder={placeholder}
          required={required}
          aria-required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <Input
          id={id}
          type={type}
          inputMode={inputMode}
          autoComplete={autoComplete}
          min={min}
          required={required}
          aria-required={required}
          value={value}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {error ? (
        <p id={errorId} className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function PreflightBriefStep({
  input,
  errors,
  isSubmitting,
  embedded = false,
  onFieldChange,
  onSubmit,
  onLoadSample
}: {
  input: PreflightInput;
  errors: FieldErrors;
  isSubmitting: boolean;
  embedded?: boolean;
  onFieldChange: (field: keyof PreflightInput, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onLoadSample: () => void;
}) {
  const Root = embedded ? "div" : "main";
  const Title = embedded ? "h3" : "h1";
  const errorCount = Object.values(errors).filter(Boolean).length;

  return (
    <Root className={embedded ? "text-foreground" : "min-h-screen px-4 py-6 text-foreground sm:px-6 lg:px-8"}>
      <div className={embedded ? "mx-auto max-w-5xl" : "mx-auto flex min-h-[calc(100vh-3rem)] max-w-5xl items-center"}>
        <Card className="w-full overflow-hidden">
          <CardHeader className="border-b border-border bg-muted">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <Badge variant="outline">
                  <Focus className="h-3.5 w-3.5" aria-hidden="true" />
                  Brief
                </Badge>
                <Title className="mt-4 text-3xl font-bold tracking-normal text-foreground sm:text-5xl">
                  Shape your launch
                </Title>
                <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                  Add the public URL, complete three guided sections, and {PRODUCT_NAME} will build the launch readiness report.
                </p>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground">
                <Crosshair className="h-4 w-4 text-success" aria-hidden="true" />
                Step 1 of 3
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-5">
            <form className="space-y-5" noValidate onSubmit={onSubmit}>
              <p className="text-xs font-medium text-muted-foreground">
                Required fields are marked with <span className="text-destructive">*</span>.
              </p>
              {errorCount > 0 ? (
                <div role="alert" className="rounded-md border border-destructive bg-background px-4 py-3 text-sm text-foreground">
                  Review the {errorCount} highlighted {errorCount === 1 ? "field" : "fields"} before generating the report.
                </div>
              ) : null}
              <section className="rounded-lg border border-border bg-background p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 flex-none items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
                    URL
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-foreground">Product URL</h2>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Reads public HTML and metadata only. PreflightAI does not sign in or execute the product.
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <PreflightField
                    id="productUrl"
                    label="Product URL"
                    value={input.productUrl}
                    error={errors.productUrl}
                    placeholder="https://example.com"
                    type="url"
                    inputMode="url"
                    autoComplete="url"
                    required
                    onChange={(value) => onFieldChange("productUrl", value)}
                  />
                </div>
                <details className="mt-4 rounded-md border border-border bg-muted p-3">
                  <summary className="cursor-pointer text-sm font-bold text-foreground">
                    Optional fallback page copy
                  </summary>
                  <div className="mt-3">
                    <PreflightField
                      id="manualPageCopy"
                      label="Manual page copy"
                      value={input.manualPageCopy}
                      error={errors.manualPageCopy}
                      placeholder="Paste visible page copy as fallback evidence if the public URL cannot be fully inspected."
                      multiline
                      onChange={(value) => onFieldChange("manualPageCopy", value)}
                    />
                  </div>
                </details>
              </section>

              <GuidedStep
                step="01"
                title="Shape the idea"
                description="Give the preflight enough context to understand what is launching and why it matters."
              >
                <PreflightField
                  id="productBrief"
                  label="Launch goal and context"
                  value={input.productBrief}
                  error={errors.productBrief}
                  placeholder="What are you launching, who is it for, and why now?"
                  multiline
                  required
                  onChange={(value) => onFieldChange("productBrief", value)}
                />
              </GuidedStep>

              <GuidedStep
                step="02"
                title="Define the audience and timing"
                description="Anchor the report around the people you need to persuade and the launch window."
              >
                <div className="grid gap-4 sm:grid-cols-[1fr_0.7fr]">
                  <PreflightField
                    id="audience"
                    label="Target audience"
                    value={input.audience}
                    error={errors.audience}
                    placeholder="Startup CTOs, product teams, support admins..."
                    required
                    onChange={(value) => onFieldChange("audience", value)}
                  />
                  <PreflightField
                    id="launchDate"
                    label="Launch date"
                    value={input.launchDate}
                    error={errors.launchDate}
                    placeholder={getLaunchDateInputValue(14)}
                    type="date"
                    min={getLaunchDateInputValue()}
                    required
                    onChange={(value) => onFieldChange("launchDate", value)}
                  />
                </div>
              </GuidedStep>

              <GuidedStep
                step="03"
                title="Add constraints and assets"
                description="Tell the agent what is real: team limits, missing pieces, and material already available."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <PreflightField
                    id="constraints"
                    label="Constraints (optional)"
                    value={input.constraints}
                    error={errors.constraints}
                    placeholder="Budget, team capacity, approvals, deadlines, launch risks..."
                    multiline
                    onChange={(value) => onFieldChange("constraints", value)}
                  />
                  <PreflightField
                    id="availableAssets"
                    label="Available assets (optional)"
                    value={input.availableAssets}
                    error={errors.availableAssets}
                    placeholder="Landing page draft, demo video, screenshots, waitlist, docs..."
                    multiline
                    onChange={(value) => onFieldChange("availableAssets", value)}
                  />
                </div>
              </GuidedStep>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="submit" disabled={isSubmitting}>
                  <ScanSearch className="h-4 w-4" aria-hidden="true" />
                  {isSubmitting ? "Starting run" : "Generate report"}
                </Button>
                <Button type="button" variant="outline" disabled={isSubmitting} onClick={onLoadSample}>
                  <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
                  Load sample
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Root>
  );
}
