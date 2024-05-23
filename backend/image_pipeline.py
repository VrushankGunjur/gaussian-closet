class ImagePipelineTask:
    def __init__(self, dim, bg_img, fg_img, coord):
        self.dim = dim
        self.bg_img = bg_img
        self.fg_img = fg_img
        self.coord = coord