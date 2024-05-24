import gradio as gr

def run_local(base, ref):
    print(base)
    print(ref)

with gr.Blocks() as demo:
    with gr.Column():
        gr.Markdown("#  Play with AnyDoor to Teleport your Target Objects! ")
        with gr.Row():
            baseline_gallery = gr.Gallery(label='Output', show_label=True, elem_id="gallery", columns=1, height=768)
            with gr.Accordion("Advanced Option", open=True):
                num_samples = 1
                strength = gr.Slider(label="Control Strength", minimum=0.0, maximum=2.0, value=1.0, step=0.01)
                ddim_steps = gr.Slider(label="Steps", minimum=1, maximum=100, value=30, step=1)
                scale = gr.Slider(label="Guidance Scale", minimum=0.1, maximum=30.0, value=4.5, step=0.1)
                seed = gr.Slider(label="Seed", minimum=-1, maximum=999999999, step=1, value=-1)
                reference_mask_refine = gr.Checkbox(label='Reference Mask Refine', value=False, interactive = True)
                enable_shape_control = gr.Checkbox(label='Enable Shape Control', value=False, interactive = True)
                
                gr.Markdown("### Guidelines")
                gr.Markdown(" Higher guidance-scale makes higher fidelity, while lower one makes more harmonized blending.")
                gr.Markdown(" Users should annotate the mask of the target object, too coarse mask would lead to bad generation.\
                              Reference Mask Refine provides a segmentation model to refine the coarse mask. ")
                gr.Markdown(" Enable shape control means the generation results would consider user-drawn masks to control the shape & pose; otherwise it \
                              considers the location and size to adjust automatically.")

    
        gr.Markdown("# Upload / Select Images for the Background (left) and Reference Object (right)")
        gr.Markdown("### You could draw coarse masks on the background to indicate the desired location and shape.")
        gr.Markdown("### <u>Do not forget</u> to annotate the target object on the reference image.")
        with gr.Row():
            base = gr.Image(label="Background", source="upload", tool="sketch", type="pil", height=512, brush_color='#FFFFFF', mask_opacity=0.5)
            ref = gr.Image(label="Reference", source="upload", tool="sketch", type="pil", height=512, brush_color='#FFFFFF', mask_opacity=0.5)
        run_local_button = gr.Button(label="Generate", value="Run")

        # with gr.Row():
        #     with gr.Column():
        #         gr.Examples(image_list, inputs=[base],label="Examples - Background Image",examples_per_page=16)
        #     with gr.Column():
        #         gr.Examples(ref_list, inputs=[ref],label="Examples - Reference Object",examples_per_page=16)
        
    run_local_button.click(fn=run_local, 
                           inputs=[base, 
                                   ref],
                        #    outputs=[baseline_gallery]
                        )

demo.launch(server_name="0.0.0.0")