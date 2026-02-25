export interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  stock_quantity: number;
  image_url?: string;
}

export interface CartItem extends Product {
  quantity: number;
}