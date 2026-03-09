# Fake spacy module to prevent build failure on Render
import sys

def main():
    print("Fake spacy module: ignoring arguments", sys.argv[1:])
    pass

if __name__ == "__main__":
    main()
