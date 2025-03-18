import { s3Client } from '@/lib/s3';
import { RekognitionClient, CompareFacesCommand, CompareFacesCommandInput } from '@aws-sdk/client-rekognition';

const rekognition = new RekognitionClient({
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export interface FaceMatchResult {
  isMatch: boolean;
  similarity?: number;
  error?: string;
}

export async function compareFaces(sourceImageKey: string, targetImageKey: string): Promise<FaceMatchResult> {
  try {
    const sourceBuffer = await s3Client.file(sourceImageKey).bytes();
    const targetBuffer = await s3Client.file(targetImageKey).bytes();

    const params: CompareFacesCommandInput = {
      SourceImage: {
        Bytes: sourceBuffer,
      },
      TargetImage: {
        Bytes: targetBuffer,
      },
      SimilarityThreshold: 90,
    };

    const command = new CompareFacesCommand(params);
    const response = await rekognition.send(command);

    if (!response.FaceMatches || response.FaceMatches.length === 0) {
      return {
        isMatch: false,
        error: 'No matching faces found',
      };
    }

    const similarity = response.FaceMatches[0].Similarity;
    return {
      isMatch: true,
      similarity,
    };
  } catch (error) {
    console.error('Error comparing faces:', error);
    return {
      isMatch: false,
      error: 'Failed to compare faces',
    };
  }
}

export async function validateAttendanceSelfie(employeePhotoKey: string, selfieKey: string): Promise<FaceMatchResult> {
  try {
    const result = await compareFaces(employeePhotoKey, selfieKey);
    return result;
  } catch (error) {
    console.error('Error validating attendance selfie:', error);
    return {
      isMatch: false,
      error: 'Failed to validate selfie',
    };
  }
}
