import { Injectable, OnModuleInit } from '@nestjs/common';
import * as ort from 'onnxruntime-node';
import sharp from 'sharp';
import * as path from 'path';
import { CLOTHING_CLASS_INDICES } from './clothing-classes.js';

@Injectable()
export class ClothingValidationService implements OnModuleInit{
    private session: ort.InferenceSession;

    async onModuleInit() {
      // cwd = current working directory
        const modelPath = path.join(process.cwd(), 'models', 'model.onnx');
        this.session = await ort.InferenceSession.create(modelPath);
        console.log('MobileNetV4 model loaded successfully');
    }

    async validate(imageBuffer: Buffer): Promise<{valid: boolean, confidence: number, reason?: string}> {
        // 1. image resize and remove alpha
        const { data, info } = await sharp(imageBuffer).resize(224, 224).removeAlpha().raw().toBuffer({ resolveWithObject: true });
        const mean = [0.485, 0.456, 0.406];
        const std  = [0.229, 0.224, 0.225];
        const tensor = new Float32Array(3 * 224 * 224);

    // to change the order of the array to fit our model to analyze
    for (let i = 0; i < 224 * 224; i++) {
        const r = data[i * 3]     / 255;
        const g = data[i * 3 + 1] / 255;
        const b = data[i * 3 + 2] / 255;
  
        tensor[i]                 = (r - mean[0]) / std[0]; // R channel
        tensor[i + 224 * 224]     = (g - mean[1]) / std[1]; // G channel
        tensor[i + 224 * 224 * 2] = (b - mean[2]) / std[2]; // B channel
      }

  
      // 3. 추론 실행
      const inputTensor = new ort.Tensor('float32', tensor, [1, 3, 224, 224]);
      const output = await this.session.run({ pixel_values: inputTensor });
      

      // 4. softmax → 확률값 변환
      const logits = output.logits.data as Float32Array;
      const probs = softmax(logits);
  
      // 5. 상위 5개 클래스 추출
      const top5 = getTopK(probs, 5);
  
      // 6. 의류 클래스 여부 확인
      const topClothing = top5.find(({ index }) =>
        CLOTHING_CLASS_INDICES.has(index)
      );
  
      if (topClothing) {
        return { valid: true, confidence: topClothing.probability };
      }
  
      return {
        valid: false,
        confidence: top5[0].probability,
        reason: 'no_clothing_detected',
      };    
    }
}

function softmax(logits: Float32Array): Float32Array {
  let max = -Infinity;
  for (const v of logits) if (v > max) max = v;

  // 2. Exp 계산과 Sum 계산을 동시에 수행
  let sum = 0;
  const probs = new Float32Array(logits.length);
  for (let i = 0; i < logits.length; i++) {
    probs[i] = Math.exp(logits[i] - max);
    sum += probs[i];
  }

  // 3. 최종 확률 변환
  for (let i = 0; i < probs.length; i++) {
    probs[i] /= sum;
  }
  return probs;
  }
  
  function getTopK(probs: Float32Array, k: number) {
    return Array.from(probs)
      .map((probability, index) => ({ probability, index }))
      .sort((a, b) => b.probability - a.probability)
      .slice(0, k);
  }