import { createConfig } from "@lifi/sdk";
import { LIFI_INTEGRATOR_ID } from "@ibea/shared";

export const initLifiConfig = () => {
  createConfig({
    integrator: LIFI_INTEGRATOR_ID,
    apiUrl: process.env.LIFI_API_URL || "https://li.quest/v1",
  });
};
