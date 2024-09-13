<script lang="ts">
    import { Camera } from 'lucide-svelte';
    import { Button } from '$lib/components/ui/button';
    import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert';
  
    let image: File | null = null;
    let uploading = false;
    let result: string | null = null;
    let error: string | null = null;
    let videoStream: MediaStream | null = null;
    let videoElement: HTMLVideoElement | null = null;
  
    async function startCamera() {
      try {
        videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoElement) {
          videoElement.srcObject = videoStream;
        }
      } catch (err) {
        error = 'Could not access the camera.';
        console.error(err);
      }
    }
  
    function capturePhoto() {
      if (!videoElement) return;
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            image = new File([blob], 'captured.png', { type: 'image/png' });
          }
        });
      }
    }
  
    async function handleUpload() {
      if (!image) {
        error = 'Please capture an image first.';
        return;
      }
  
      uploading = true;
      error = null;
  
      const formData = new FormData();
      formData.append('file', image);
  
      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
  
        if (!response.ok) {
          throw new Error('Upload failed');
        }
  
        const data = await response.json();
        result = data.result;
      } catch (err) {
        error = 'An error occurred during upload or processing.';
        console.error(err);
      } finally {
        uploading = false;
      }
    }
  </script>
  
  <div class="flex flex-col items-center justify-center min-h-screen p-4">
    <video bind:this={videoElement} autoplay class="mb-4 max-w-full h-auto rounded-lg shadow-lg"></video>
    <Button on:click={startCamera} class="mb-4">
      Start Camera
    </Button>
    <Button on:click={capturePhoto} class="mb-4">
      Capture Photo
    </Button>
    {#if image}
      <img
        src={URL.createObjectURL(image)}
        alt="Captured"
        class="mb-4 max-w-full h-auto rounded-lg shadow-lg"
      />
    {/if}
    <Button on:click={handleUpload} disabled={!image || uploading}>
      {uploading ? 'Uploading...' : 'Upload and Process'}
    </Button>
    {#if error}
      <Alert variant="destructive" class="mt-4">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    {/if}
    {#if result}
      <Alert class="mt-4">
        <AlertTitle>Result</AlertTitle>
        <AlertDescription>{result}</AlertDescription>
      </Alert>
    {/if}
  </div>