import ml_model
import threading

def _test():
    try:
        models = ml_model.get_models()
        print("Models loaded successfully.")
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    _test()
