class ImagePipelineTask:
    def __init__(self, dim, bg_img, fg_img, coord, mask):
        self.dim = dim
        self.bg_img = bg_img
        self.fg_img = fg_img
        self.coord = coord
        self.mask = mask


# below is the inference function lmao
# def inference_single_image(ref_image, ref_mask, tar_image, tar_mask)
# bg is base or target. fg is ref image

