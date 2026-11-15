import { domMax } from "motion/react";

/* Layout animations (domMax), loaded on demand by the components that need them: the team
   board's cards make room for each other (#137, 14 Portal — Motion "Board drag"). Kept out
   of the root feature bundle (motion-features.ts), so other pages don't pay for it. */
export default domMax;
