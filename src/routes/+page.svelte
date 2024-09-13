<script lang="ts">
    import { Camera } from 'lucide-svelte';
    import { Button } from '$lib/components/ui/button';
    import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert';
    import { onMount } from 'svelte';

    let image: File | null = null;
    let uploading = false;
    let result: string | null = null;
    let error: string | null = null;
    let videoStream: MediaStream | null = null;
    let videoElement: HTMLVideoElement | null = null;
    let audioUrl = '';

    async function startCamera() {
      try {
        videoStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: { exact: "environment" } } // Use "environment" for front-facing camera
        });
        if (videoElement) {
          videoElement.srcObject = videoStream;
          videoElement.style.width = '300px'; // Set the desired width
          videoElement.style.height = 'auto'; // Maintain aspect ratio
        }
      } catch (err) {
        error = 'Could not access the camera.';
        console.error(err);
      }
    }
  
    async function capturePhoto() {
      // Implement your photo capture logic here
      // For example, using the MediaDevices API
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: { exact: "environment" } } // Use "environment" for front-facing camera
      });
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg'));
      stream.getTracks().forEach(track => track.stop()); // Stop the video stream
      return new File([blob], 'photo.jpg', { type: 'image/jpeg' });
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

    async function uploadPhoto() {
      const file = await capturePhoto();
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        audioUrl = URL.createObjectURL(audioBlob);
        playAudio();
        setTimeout(uploadPhoto, 5000); // Take another photo after 5 seconds
      } else {
        console.error('Failed to upload photo');
      }
    }

    function playAudio() {
      const audio = new Audio(audioUrl);
      audio.play();
    }

    onMount(() => {
      uploadPhoto();
    });
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