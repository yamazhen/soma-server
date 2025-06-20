import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel
import gc

class CustomEducationalModel:
    def __init__(self, model_path: str = "llama32-fine-tuned"):
        self.device = "mps" if torch.backends.mps.is_available() else "cpu"
        torch.set_num_threads(2)

        print(f"Loading model on {self.device}...")
        
        base_model_name = "unsloth/Llama-3.2-1B-Instruct"
        self.tokenizer = AutoTokenizer.from_pretrained(
            base_model_name, 
            use_fast=True,
            trust_remote_code=True)

        self.model = AutoModelForCausalLM.from_pretrained(
            base_model_name,
            torch_dtype=torch.float16,
            device_map="auto",
            low_cpu_mem_usage=True,
            use_cache=True,
            attn_implementation="eager"
        )
        
        self.model = PeftModel.from_pretrained(
            self.model,
            model_path,
            torch_dtype=torch.float16
        )

        self.model = self.model.to(self.device)
        if self.device == "mps":
            self.model.half()

        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token
            self.tokenizer.pad_token_id = self.tokenizer.eos_token_id

        self.model.eval()

        torch.cuda.empty_cache() if torch.cuda.is_available() else gc.collect()
        
        print("Model loaded!")
    
    def generate(self, prompt: str, max_tokens: int = 128) -> str:
        gc.collect()

        formatted_prompt = f"User: {prompt}\nAssistant:"

        inputs = self.tokenizer(
            formatted_prompt,
            return_tensors="pt",
            padding=False,
            truncation=True,
            max_length=512,
            return_attention_mask=True
        )
        
        input_ids = inputs['input_ids'].to(self.device)
        attention_mask = inputs['attention_mask'].to(self.device)
        input_length = input_ids.shape[1]
        
        with torch.no_grad():
            if self.device == "mps":
                outputs = self.model.generate(
                    input_ids=input_ids,
                    attention_mask=attention_mask,
                    max_new_tokens=min(max_tokens, 256),
                    temperature=0.7,
                    do_sample=True,
                    top_p=0.9,
                    pad_token_id=self.tokenizer.pad_token_id,
                    eos_token_id=self.tokenizer.eos_token_id,
                    use_cache=True,
                    repetition_penalty=1.1
                )
            else:
                with torch.autocast(device_type="cpu", dtype=torch.float16):
                    outputs = self.model.generate(
                        input_ids=input_ids,
                        attention_mask=attention_mask,
                        max_new_tokens=min(max_tokens, 256),
                        temperature=0.7,
                        do_sample=True,
                        top_p=0.9,
                        pad_token_id=self.tokenizer.pad_token_id,
                        eos_token_id=self.tokenizer.eos_token_id,
                        use_cache=True,
                        repetition_penalty=1.1
                    )
                
            new_tokens = outputs[0][input_length:]
            response = self.tokenizer.decode(new_tokens, skip_special_tokens=True)

            response = response.split("User:")[0].split("Assistant:")[0].strip()

            gc.collect()

            return response

_model = None

def get_model():
    global _model
    if _model is None:
        _model = CustomEducationalModel()
    return _model
