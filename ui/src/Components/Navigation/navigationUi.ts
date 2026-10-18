import classes from "./Navigation.module.css";

export const ITEM_CLASSNAMES = {
  root: classes.item,
  section: classes.itemSection,
  body: classes.itemBody,
};

export const railTooltip = (rail: boolean, hidden = false) =>
  ({
    position: "right",
    offset: 20,
    disabled: !rail || hidden,
    events: { hover: rail, focus: rail, touch: false },
  }) as const;
