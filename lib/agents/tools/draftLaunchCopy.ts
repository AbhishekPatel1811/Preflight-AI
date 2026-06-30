import { tool } from "@openai/agents";
import { z } from "zod";
import type { PreflightInput } from "@/lib/types";

export type DraftLaunchCopyOutput = {
  copy: {
    channel: string;
    headline: string;
    body: string;
    cta: string;
    notes: string;
  }[];
};

function inferChannels(input: PreflightInput) {
  const text = `${input.availableAssets} ${input.constraints}`.toLowerCase();
  const channels = [
    text.includes("email") && "Email",
    text.includes("linkedin") && "LinkedIn",
    text.includes("product hunt") && "Product Hunt",
    text.includes("in-app") && "In-app announcement",
    text.includes("changelog") && "Changelog",
    text.includes("landing") && "Landing page"
  ].filter(Boolean) as string[];

  return channels.length > 0 ? channels : ["Landing page", "LinkedIn", "Email"];
}

export function draftLaunchCopy(input: PreflightInput): DraftLaunchCopyOutput {
  const productLine = input.productBrief.split(/[.!?]/)[0]?.trim() || "New product launch";

  return {
    copy: inferChannels(input).map((channel) => ({
      channel,
      headline: `${productLine} for ${input.audience}`,
      body: `We are launching ${productLine.toLowerCase()} to help ${input.audience.toLowerCase()} move faster with less launch-day uncertainty. Built around the constraints and assets already on hand, this release keeps the first message clear and action-oriented.`,
      cta: channel === "Email" ? "Join the waitlist" : "See the launch",
      notes: "Tighten the headline once the final product name, proof point, and primary channel are confirmed."
    }))
  };
}

export const draftLaunchCopyTool = tool({
  name: "draft_channel_launch_copy",
  description: "Draft channel-specific launch copy for likely launch channels.",
  parameters: z.object({
    productBrief: z.string(),
    audience: z.string(),
    launchDate: z.string(),
    constraints: z.string(),
    availableAssets: z.string()
  }),
  async execute(input) {
    // Deterministic copy starter; the agent can refine tone and specificity.
    return draftLaunchCopy(input);
  }
});
