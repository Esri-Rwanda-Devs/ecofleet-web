/**
 * Colours for routes pinned by the dashboard's route filter.
 *
 * Chosen to stay legible on satellite imagery and to be distinguishable from
 * each other at a glance. Green (#16A34A) is deliberately absent — on this map
 * green means exactly one thing, "a live trip is running here", and the filter
 * must not borrow it.
 *
 * The colour follows the route's position in the *sorted route list*, not its
 * position in the selection, so a given route keeps the same colour no matter
 * what else the operator pins or unpins.
 */
const ROUTE_FILTER_COLORS = [
  '#22D3EE', // cyan
  '#F472B6', // pink
  '#FBBF24', // amber
  '#A78BFA', // violet
  '#FB923C', // orange
  '#60A5FA', // blue
  '#F87171', // red
  '#2DD4BF', // teal
  '#C084FC', // purple
  '#FCD34D', // yellow
];

export function routeColorAt(index: number): string {
  if (index < 0) return ROUTE_FILTER_COLORS[0];
  return ROUTE_FILTER_COLORS[index % ROUTE_FILTER_COLORS.length];
}

export { ROUTE_FILTER_COLORS };
