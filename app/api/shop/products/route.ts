import { NextRequest, NextResponse } from "next/server";
import {
  addProduct,
  deleteProduct,
  getProducts,
  updateProduct,
} from "@/lib/shop";
import { isAuthed } from "@/lib/auth";

export async function GET() {
  const products = await getProducts();
  return NextResponse.json({ products });
}

export async function POST(req: NextRequest) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, images, title, price, size, condition, description } =
    await req.json();

  if (
    !id ||
    !Array.isArray(images) ||
    images.length === 0 ||
    !title ||
    typeof price !== "number"
  ) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  await addProduct({
    id,
    images,
    title: String(title).slice(0, 120),
    price,
    size: size ? String(size).slice(0, 40) : undefined,
    condition: condition ? String(condition).slice(0, 60) : undefined,
    description: description ? String(description).slice(0, 1000) : undefined,
  });

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, ...fields } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  await updateProduct(id, fields);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  await deleteProduct(id);
  return NextResponse.json({ ok: true });
}
