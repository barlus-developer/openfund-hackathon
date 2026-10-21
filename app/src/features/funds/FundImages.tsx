import { useState } from "react";
import { ImageOff, Images, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  imageURL,
  metadataImages,
  useFundMetadata,
  type FundImage,
} from "@/lib/fundMetadata";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";

export function ProjectImage({
  image,
  alt,
  className,
  eager = false,
  localURL,
  proportional = false,
}: {
  image?: FundImage;
  alt: string;
  className?: string;
  eager?: boolean;
  localURL?: string;
  proportional?: boolean;
}) {
  let src: string | undefined;
  try {
    src = localURL || (image?.uri ? imageURL(image.uri) : undefined);
  } catch {
    /* Use the same fallback as missing images. */
  }
  return (
    <ImageContent
      key={src || "missing"}
      src={src}
      image={image}
      alt={alt}
      className={className}
      eager={eager}
      proportional={proportional}
    />
  );
}

function ImageContent({
  src,
  image,
  alt,
  className,
  eager,
  proportional,
}: {
  src?: string;
  image?: FundImage;
  alt: string;
  className?: string;
  eager: boolean;
  proportional: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <div
      className={cn("relative overflow-hidden bg-muted", className)}
      style={
        proportional
          ? { aspectRatio: `${image?.width || 4} / ${image?.height || 3}` }
          : undefined
      }
    >
      {src && !failed ? (
        <>
          {!loaded ? (
            <Skeleton className="absolute inset-0 size-full rounded-none" />
          ) : null}
          <img
            src={src}
            alt={alt}
            width={image?.width || 1600}
            height={image?.height || 900}
            loading={eager ? "eager" : "lazy"}
            decoding="async"
            referrerPolicy="no-referrer"
            className={cn(
              "size-full object-cover transition-opacity duration-300 motion-reduce:transition-none",
              loaded ? "opacity-100" : "opacity-0",
            )}
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
          />
        </>
      ) : (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center text-muted-foreground"
          role="img"
          aria-label={failed ? "ບໍ່ສາມາດໂຫຼດຮູບພາບໄດ້" : "ຍັງບໍ່ມີຮູບພາບ"}
        >
          <ImageOff className="size-7 opacity-60" aria-hidden="true" />
          <span className="text-xs">
            {failed ? "ບໍ່ສາມາດໂຫຼດຮູບພາບໄດ້" : "ຍັງບໍ່ມີຮູບພາບ"}
          </span>
        </div>
      )}
    </div>
  );
}

export function FundCover({
  uri,
  hash,
  title,
}: {
  uri: string;
  hash?: string;
  title: string;
}) {
  const query = useFundMetadata(uri, hash);
  const image = metadataImages(query.data).coverImage;
  if (query.isLoading)
    return <Skeleton className="fund-cover aspect-video w-full rounded-none" />;
  return (
    <ProjectImage
      image={image}
      alt={image?.caption || title}
      className="fund-cover aspect-video w-full"
    />
  );
}

export function ImageGallery({
  images,
  title,
}: {
  images: FundImage[];
  title: string;
}) {
  const [selected, setSelected] = useState(0);
  if (!images.length) return null;
  const active = images[Math.min(selected, images.length - 1)];
  return (
    <section className="flex min-w-0 flex-col gap-4" aria-label="ຮູບພາບກອງທຶນ">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Images className="size-5 text-primary" aria-hidden="true" />
        ຮູບພາບກອງທຶນ
      </h2>
      <Dialog>
        <div className="grid items-start gap-4 sm:grid-cols-2">
          {images.map((image, index) => (
            <figure key={`${image.uri}-${index}`} className="min-w-0">
              <DialogTrigger
                render={
                  <button
                    type="button"
                    className="block w-full cursor-zoom-in overflow-hidden rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                    aria-label={`ເບິ່ງຮູບພາບ ${index + 1}: ${image.caption || title}`}
                    onClick={() => setSelected(index)}
                  />
                }
              >
                <ProjectImage
                  image={image}
                  alt={image.caption || `${title} · ${index + 1}`}
                  proportional
                  className="gallery-image w-full"
                />
              </DialogTrigger>
              {image.caption ? (
                <figcaption className="pt-2 text-sm leading-7 text-muted-foreground wrap-anywhere">
                  {image.caption}
                </figcaption>
              ) : null}
            </figure>
          ))}
        </div>
        <DialogContent
          showCloseButton={false}
          className="image-preview flex max-h-[92dvh] max-w-5xl flex-col gap-4 overflow-y-auto"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>
                {selected + 1} / {images.length}
              </DialogDescription>
            </div>
            <DialogClose
              render={
                <Button variant="outline" size="icon" aria-label="ປິດຮູບພາບ" />
              }
            >
              <X aria-hidden="true" />
            </DialogClose>
          </div>
          <ProjectImage
            key={active.uri}
            image={active}
            eager
            proportional
            alt={active.caption || title}
            className="preview-image min-h-40 w-full rounded-lg"
          />
          {active.caption ? (
            <p className="text-sm leading-7 wrap-anywhere">{active.caption}</p>
          ) : null}
          {images.length > 1 ? (
            <div className="flex justify-between gap-3">
              <Button
                variant="outline"
                disabled={selected === 0}
                onClick={() => setSelected((index) => index - 1)}
              >
                <ChevronLeft data-icon="inline-start" aria-hidden="true" />
                ກ່ອນໜ້າ
              </Button>
              <Button
                variant="outline"
                disabled={selected === images.length - 1}
                onClick={() => setSelected((index) => index + 1)}
              >
                ຕໍ່ໄປ
                <ChevronRight data-icon="inline-end" aria-hidden="true" />
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}

export function FundVisualStory({
  uri,
  hash,
  title,
  summary,
}: {
  uri: string;
  hash?: string;
  title: string;
  summary: string;
}) {
  const query = useFundMetadata(uri, hash);
  const images = metadataImages(query.data);
  return (
    <div className="flex min-w-0 flex-col gap-6">
      {query.isLoading ? (
        <Skeleton className="aspect-video w-full rounded-2xl" />
      ) : (
        <ProjectImage
          image={images.coverImage}
          alt={images.coverImage?.caption || title}
          eager
          className="aspect-video w-full rounded-2xl"
        />
      )}
      <p className="whitespace-pre-wrap text-base leading-8">{summary}</p>
      {query.isLoading ? (
        <p role="status" className="text-sm text-muted-foreground">
          ກຳລັງໂຫຼດຮູບພາບ…
        </p>
      ) : null}
      {query.error ? (
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <p>ຮູບພາບຍັງບໍ່ພ້ອມສະແດງ.</p>
          <Button
            variant="outline"
            size="sm"
            disabled={query.isFetching}
            onClick={() => query.refetch()}
          >
            ລອງໃໝ່
          </Button>
        </div>
      ) : null}
      <ImageGallery images={images.descriptionImages} title={title} />
    </div>
  );
}
