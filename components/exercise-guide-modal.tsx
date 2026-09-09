"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, Search } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

type Props = {
  name: string;
  gifUrl: string | null;
  open: boolean;
  onClose: () => void;
  onImageUnavailable: () => boolean;
};

export function ExerciseGuideModal({
  name,
  gifUrl,
  open,
  onClose,
  onImageUnavailable,
}: Props) {
  const [imageFailed, setImageFailed] = useState(false);
  const googleImagesUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(
    `${name} exercise proper form`
  )}`;
  const showImage = Boolean(gifUrl) && !imageFailed;

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          setImageFailed(false);
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">{name}</DialogTitle>
        </DialogHeader>

        {showImage ? (
          <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-muted">
            <Image
              src={gifUrl!}
              alt={name}
              fill
              className="object-cover"
              unoptimized
              onError={() => {
                if (onImageUnavailable()) {
                  setImageFailed(false);
                  onClose();
                } else {
                  setImageFailed(true);
                }
              }}
            />
          </div>
        ) : (
          <div className="flex min-h-64 flex-col items-center justify-center rounded-xl bg-muted px-5 text-center">
            <Search className="mb-3 h-9 w-9 text-primary" />
            <p className="text-sm font-medium text-foreground">
              {imageFailed ? "This exercise image could not be loaded." : "No image is available for this exercise."}
            </p>
            <p className="mb-4 mt-1 text-xs text-muted-foreground">
              Search Google Images for demonstrations of proper form.
            </p>
            <Button asChild className="gap-2">
              <a href={googleImagesUrl} target="_blank" rel="noopener noreferrer">
                View Google results
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
        )}

        {showImage && (
          <p className="text-xs text-muted-foreground text-center -mt-1">
            Images from{" "}
            <span className="underline underline-offset-2">free-exercise-db</span>
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
