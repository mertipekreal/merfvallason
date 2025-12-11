#!/usr/bin/env python3
"""
SAM (Segment Anything Model) Microservice for Merf.ai
Runs MobileSAM/FastSAM models and exposes HTTP API for image segmentation.
Zero-Disk I/O architecture - all processing happens in memory.
"""

import io
import os
import sys
import json
import base64
import logging
from typing import Optional, List, Tuple

# Setup logging
logging.basicConfig(level=logging.INFO, format='[SAM] %(asctime)s - %(message)s')
logger = logging.getLogger(__name__)

try:
    from flask import Flask, request, jsonify, send_file
    from PIL import Image
    import numpy as np
except ImportError as e:
    logger.error(f"Missing dependency: {e}")
    logger.error("Install with: pip install flask pillow numpy")
    sys.exit(1)

# Lazy load heavy dependencies
sam_model = None
fastsam_model = None
model_loaded = False

app = Flask(__name__)

def load_models():
    """Lazy load SAM models to avoid startup delays"""
    global sam_model, fastsam_model, model_loaded
    
    if model_loaded:
        return True
    
    try:
        from ultralytics import SAM, FastSAM
        
        logger.info("Loading MobileSAM model (~40MB)...")
        sam_model = SAM('mobile_sam.pt')
        logger.info("MobileSAM loaded successfully!")
        
        logger.info("Loading FastSAM model (~24MB)...")
        fastsam_model = FastSAM('FastSAM-s.pt')
        logger.info("FastSAM loaded successfully!")
        
        model_loaded = True
        return True
        
    except Exception as e:
        logger.error(f"Failed to load models: {e}")
        return False


def process_image_with_sam(
    image: Image.Image,
    model_type: str = "mobilesam",
    points: Optional[List[List[int]]] = None,
    labels: Optional[List[int]] = None,
    bboxes: Optional[List[List[int]]] = None,
    imgsz: int = 640
) -> Tuple[Optional[bytes], dict]:
    """
    Process image with SAM model using Zero-Disk I/O.
    
    Args:
        image: PIL Image object
        model_type: "mobilesam" or "fastsam"
        points: List of [x, y] coordinates for point prompts
        labels: List of labels (1=foreground, 0=background) for points
        bboxes: List of [x1, y1, x2, y2] bounding boxes
        imgsz: Image size for processing
    
    Returns:
        Tuple of (result_image_bytes, metadata_dict)
    """
    if not load_models():
        return None, {"error": "Models not loaded"}
    
    try:
        # Select model
        model = sam_model if model_type == "mobilesam" else fastsam_model
        
        if model is None:
            return None, {"error": f"Model {model_type} not available"}
        
        # Prepare prompt arguments
        kwargs = {"retina_masks": False, "imgsz": imgsz}
        
        if points is not None and len(points) > 0:
            kwargs["points"] = points
            if labels is not None:
                kwargs["labels"] = labels
        
        if bboxes is not None and len(bboxes) > 0:
            kwargs["bboxes"] = bboxes
        
        # Run inference
        logger.info(f"Running {model_type} inference with params: {kwargs}")
        results = model(image, **kwargs)
        
        if not results or len(results) == 0:
            return None, {"error": "No results from model"}
        
        result = results[0]
        
        # Extract metadata
        metadata = {
            "model": model_type,
            "num_masks": 0,
            "image_size": {"width": image.width, "height": image.height}
        }
        
        if result.masks is not None:
            masks_data = result.masks.data.cpu().numpy()
            metadata["num_masks"] = len(masks_data)
            metadata["mask_areas"] = [int(np.sum(m)) for m in masks_data]
        
        # Generate visualization (BGR -> RGB)
        res_array = result.plot()
        res_image = Image.fromarray(res_array[..., ::-1])
        
        # Save to BytesIO (Zero-Disk I/O)
        img_buffer = io.BytesIO()
        res_image.save(img_buffer, format='JPEG', quality=85)
        img_buffer.seek(0)
        
        logger.info(f"Segmentation complete: {metadata['num_masks']} masks found")
        return img_buffer.getvalue(), metadata
        
    except Exception as e:
        logger.error(f"Processing error: {e}")
        return None, {"error": str(e)}


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "models_loaded": model_loaded,
        "service": "SAM Microservice"
    })


@app.route('/load', methods=['POST'])
def load_models_endpoint():
    """Explicitly load models"""
    success = load_models()
    return jsonify({
        "success": success,
        "models_loaded": model_loaded
    })


@app.route('/segment', methods=['POST'])
def segment_image():
    """
    Main segmentation endpoint.
    
    Accepts multipart/form-data with:
    - file: Image file
    - model: "mobilesam" or "fastsam" (optional, default: mobilesam)
    - points: JSON array of [x, y] coordinates (optional)
    - labels: JSON array of labels for points (optional)
    - bboxes: JSON array of [x1, y1, x2, y2] boxes (optional)
    - imgsz: Image processing size (optional, default: 640)
    
    Returns:
    - Segmented image as JPEG with metadata in headers
    """
    try:
        # Validate file
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "Empty filename"}), 400
        
        # Read image from memory (Zero-Disk I/O)
        img_bytes = file.read()
        image = Image.open(io.BytesIO(img_bytes)).convert('RGB')
        
        # Parse parameters
        model_type = request.form.get('model', 'mobilesam')
        if model_type not in ['mobilesam', 'fastsam']:
            model_type = 'mobilesam'
        
        imgsz = int(request.form.get('imgsz', 640))
        
        # Parse prompts
        points = None
        labels = None
        bboxes = None
        
        if 'points' in request.form:
            try:
                points = json.loads(request.form['points'])
            except json.JSONDecodeError:
                pass
        
        if 'labels' in request.form:
            try:
                labels = json.loads(request.form['labels'])
            except json.JSONDecodeError:
                pass
        
        if 'bboxes' in request.form:
            try:
                bboxes = json.loads(request.form['bboxes'])
            except json.JSONDecodeError:
                pass
        
        # Process image
        result_bytes, metadata = process_image_with_sam(
            image=image,
            model_type=model_type,
            points=points,
            labels=labels,
            bboxes=bboxes,
            imgsz=imgsz
        )
        
        if result_bytes is None:
            return jsonify(metadata), 500
        
        # Return image with metadata in headers
        response = send_file(
            io.BytesIO(result_bytes),
            mimetype='image/jpeg',
            as_attachment=False
        )
        
        response.headers['X-SAM-Model'] = metadata.get('model', 'unknown')
        response.headers['X-SAM-Masks'] = str(metadata.get('num_masks', 0))
        response.headers['X-SAM-Metadata'] = base64.b64encode(
            json.dumps(metadata).encode()
        ).decode()
        
        return response
        
    except Exception as e:
        logger.error(f"Segment endpoint error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/segment-json', methods=['POST'])
def segment_image_json():
    """
    Segmentation endpoint that returns JSON with base64 image.
    Same parameters as /segment but returns JSON response.
    """
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "Empty filename"}), 400
        
        img_bytes = file.read()
        image = Image.open(io.BytesIO(img_bytes)).convert('RGB')
        
        model_type = request.form.get('model', 'mobilesam')
        if model_type not in ['mobilesam', 'fastsam']:
            model_type = 'mobilesam'
        
        imgsz = int(request.form.get('imgsz', 640))
        
        points = None
        labels = None
        bboxes = None
        
        if 'points' in request.form:
            try:
                points = json.loads(request.form['points'])
            except json.JSONDecodeError:
                pass
        
        if 'labels' in request.form:
            try:
                labels = json.loads(request.form['labels'])
            except json.JSONDecodeError:
                pass
        
        if 'bboxes' in request.form:
            try:
                bboxes = json.loads(request.form['bboxes'])
            except json.JSONDecodeError:
                pass
        
        result_bytes, metadata = process_image_with_sam(
            image=image,
            model_type=model_type,
            points=points,
            labels=labels,
            bboxes=bboxes,
            imgsz=imgsz
        )
        
        if result_bytes is None:
            return jsonify({"success": False, **metadata}), 500
        
        # Encode image as base64
        image_base64 = base64.b64encode(result_bytes).decode('utf-8')
        
        return jsonify({
            "success": True,
            "image": f"data:image/jpeg;base64,{image_base64}",
            "metadata": metadata
        })
        
    except Exception as e:
        logger.error(f"Segment-JSON endpoint error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


if __name__ == '__main__':
    port = int(os.environ.get('SAM_PORT', 8081))
    logger.info(f"Starting SAM Microservice on port {port}...")
    
    # Pre-load models for faster first request
    if os.environ.get('PRELOAD_MODELS', '0') == '1':
        logger.info("Pre-loading models...")
        load_models()
    
    app.run(host='0.0.0.0', port=port, threaded=True)
