# Complex conflict with multiple sections
COMPLEX_CONFLICT = '''
class Calculator:
<<<<<<< CURRENT
    def add(self, a, b):
        return a + b
=======
    def sum(self, x, y):
        return x + y
>>>>>>> INCOMING

<<<<<<< CURRENT
    def multiply(a, b):
        return a * b
=======
    def product(x, y):
        return x * y
>>>>>>> INCOMING
'''