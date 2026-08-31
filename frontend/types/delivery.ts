export type DeliveryStatus =
  | "PENDING"
  | "ASSIGNED"
  | "PICKED_UP"
  | "DELIVERED";

export interface Delivery {
  id: string;
  retailer_id: string;
  rider_id: string | null;
  customer_name: string;
  customer_phone: string;
  address: string;
  item_description: string;
  status: DeliveryStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateDeliveryPayload {
  customer_name: string;
  customer_phone: string;
  address: string;
  item_description: string;
}