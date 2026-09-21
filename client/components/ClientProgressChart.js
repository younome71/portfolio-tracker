import { Tooltip } from "@mantine/core";

/**
 * Segmented allocation bar with visible gaps between slices.
 * Expects sections: { value, color, tooltip? }[] where value is a percentage.
 */
export default function ClientProgressChart({ sections = [] }) {
  const total = sections.reduce((sum, s) => sum + (Number(s.value) || 0), 0);
  if (!sections.length || total <= 0) return null;

  return (
    <div className="pt-alloc-bar" role="img" aria-label="Asset allocation">
      {sections.map((section, index) => {
        const pct = Math.max(0, Number(section.value) || 0);
        if (pct < 0.05) return null;
        const segment = (
          <div
            key={`${section.color}-${index}`}
            className="pt-alloc-bar-seg"
            style={{
              flexGrow: pct,
              flexBasis: 0,
              background: section.color,
            }}
          />
        );
        if (!section.tooltip) return segment;
        return (
          <Tooltip
            key={`${section.color}-${index}-tip`}
            label={section.tooltip}
            withArrow
            position="top"
          >
            {segment}
          </Tooltip>
        );
      })}
    </div>
  );
}
