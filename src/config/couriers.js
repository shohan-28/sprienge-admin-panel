// Registry of supported couriers. The backend's `courier` field on Order
// is already a plain string (not hardcoded to Steadfast), so adding a new
// courier later means: add its service file in backend-reference/ (mirror
// steadfastService.js), add its entry here, and the courier-selector UI in
// OrderDetails picks it up automatically.
export const COURIERS = [
  { id: "steadfast", label: "Steadfast", active: true },
  { id: "pathao", label: "Pathao Courier", active: false },
  { id: "redx", label: "RedX", active: false },
];

export const DEFAULT_COURIER = "steadfast";
