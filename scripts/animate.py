import argparse
import os
import cv2
import numpy as np
from PIL import Image

def apply_animation(image, animation_type):
    # Convert image to numpy array
    img_array = np.array(image)
    
    # Create a transparent background
    background = np.zeros((img_array.shape[0], img_array.shape[1], 4), dtype=np.uint8)
    
    # Generate frames based on animation type
    frames = []
    if animation_type == "wave":
        # Wave animation with more pronounced effect
        for i in range(16):
            angle = np.sin(i * np.pi / 8) * 0.2  # Increased rotation angle
            matrix = cv2.getRotationMatrix2D((img_array.shape[1]/2, img_array.shape[0]/2), angle * 15, 1)
            rotated = cv2.warpAffine(img_array, matrix, (img_array.shape[1], img_array.shape[0]))
            # Composite with transparent background
            alpha = rotated[:, :, 3:4] / 255.0
            composite = rotated[:, :, :3] * alpha + background[:, :, :3] * (1 - alpha)
            composite = np.concatenate([composite, rotated[:, :, 3:4]], axis=2)
            frames.append(Image.fromarray(composite.astype(np.uint8)))
    elif animation_type == "blink":
        # Blink animation with more contrast
        for i in range(16):
            opacity = 1 - abs(np.sin(i * np.pi / 8))
            frame = img_array.copy()
            # Update alpha channel
            frame[:, :, 3] = (frame[:, :, 3] * opacity).astype(np.uint8)
            # Composite with transparent background
            alpha = frame[:, :, 3:4] / 255.0
            composite = frame[:, :, :3] * alpha + background[:, :, :3] * (1 - alpha)
            composite = np.concatenate([composite, frame[:, :, 3:4]], axis=2)
            frames.append(Image.fromarray(composite.astype(np.uint8)))
    else:  # bounce
        # Bounce animation with larger movement
        for i in range(16):
            offset = int(np.sin(i * np.pi / 8) * 30)  # Increased bounce height
            matrix = np.float32([[1, 0, 0], [0, 1, offset]])
            translated = cv2.warpAffine(img_array, matrix, (img_array.shape[1], img_array.shape[0]))
            # Composite with transparent background
            alpha = translated[:, :, 3:4] / 255.0
            composite = translated[:, :, :3] * alpha + background[:, :, :3] * (1 - alpha)
            composite = np.concatenate([composite, translated[:, :, 3:4]], axis=2)
            frames.append(Image.fromarray(composite.astype(np.uint8)))
    
    return frames

def save_animation(frames, output_dir):
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)

    # Save as GIF with shorter duration for smoother animation
    frames[0].save(
        os.path.join(output_dir, "animation.gif"),
        save_all=True,
        append_images=frames[1:],
        duration=50,  # Reduced duration for faster animation
        loop=0,
        optimize=False,  # Disable optimization to maintain quality
        transparency=0,  # Use first color as transparency
        disposal=2  # Clear the frame before drawing the next one
    )

    # Save preview GIF (same as animation.gif)
    frames[0].save(
        os.path.join(output_dir, "preview.gif"),
        save_all=True,
        append_images=frames[1:],
        duration=50,  # Reduced duration for faster animation
        loop=0,
        optimize=False,  # Disable optimization to maintain quality
        transparency=0,  # Use first color as transparency
        disposal=2  # Clear the frame before drawing the next one
    )

def main():
    parser = argparse.ArgumentParser(description="Animate a sketch using basic image processing")
    parser.add_argument("--input", required=True, help="Input image path")
    parser.add_argument("--output", required=True, help="Output directory")
    parser.add_argument("--type", required=True, choices=["wave", "blink", "bounce"], help="Animation type")
    
    args = parser.parse_args()

    # Create output directory
    os.makedirs(args.output, exist_ok=True)

    # Load input image
    image = Image.open(args.input)
    
    # Convert to RGBA if not already
    if image.mode != 'RGBA':
        image = image.convert('RGBA')

    # Apply animation
    frames = apply_animation(image, args.type)

    # Save animation in different formats
    save_animation(frames, args.output)

if __name__ == "__main__":
    main() 