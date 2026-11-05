import Image, { type ImageProps } from "next/image";

/**
 * next/image wrapper: uploads are optimized; generated SVG placeholders and anything that is not a
 * site-relative path (legacy data) are passed through unoptimized so a bad URL can never crash a page.
 */
export function ShopImage(props: ImageProps) {
  const src = typeof props.src === "string" ? props.src : "";
  const passThrough = src.endsWith(".svg") || !/^\/(?!\/)/.test(src);
  // eslint-disable-next-line jsx-a11y/alt-text -- alt is passed through props
  return <Image {...props} unoptimized={props.unoptimized ?? passThrough} />;
}
