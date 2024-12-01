import socket
import time
import csv
import re
import os
import sys

M_SIZE = 2048

host = '0.0.0.0'
port = 1239

locaddr = (host, port)

# ①ソケットを作成する
sock = socket.socket(socket.AF_INET, type=socket.SOCK_DGRAM)
print('create socket')

# ②自ホストで使用するIPアドレスとポート番号を指定
sock.bind(locaddr)

if os.path.isfile('gaze.csv'):
    print('Nooooooooooooooooooooooo!!!!!!!!!!1111')
    sys.exit(1)

with open('gaze.csv', 'w') as f:
    csv.writer(f).writerow([
        'timestamp [ms]',
        *[f'camera transform {i}' for i in range(16)],
        *[f'face transform {i}' for i in range(16)],
        *[f'left eye transform {i}' for i in range(16)],
        *[f'right eye transform {i}' for i in range(16)],
        *[f'camera euler {p}' for p in ['y', 'p', 'r']],
    ])

def float_to_str(f):
    float_string = repr(f)
    if 'e' in float_string:  # detect scientific notation
        digits, exp = float_string.split('e')
        digits = digits.replace('.', '').replace('-', '')
        exp = int(exp)
        zero_padding = '0' * (abs(exp) - 1)  # minus 1 for decimal point in the sci notation
        sign = '-' if f < 0 else ''
        if exp > 0:
            float_string = '{}{}{}.0'.format(sign, digits, zero_padding)
        else:
            float_string = '{}0.{}{}'.format(sign, zero_padding, digits)
    return float_string

while True:
    try :
        message, cli_addr = sock.recvfrom(M_SIZE)
        print(message, cli_addr)
        message = message.decode(encoding='utf-8')
        print(message)
        # print(f'Received message is [{message}]')
        data = [float_to_str(float(re.findall(r'[0-9.e+-]+', i)[-1])) for i in message.split(',')]
        print(data)
        with open('gaze_raw.csv', 'a') as f:
            f.write(message)
        with open('gaze.csv', 'a') as f:
            csv.writer(f).writerow(data)

    except KeyboardInterrupt:
        print ('\n . . .\n')
        sock.close()
        break

# rows = [re.findall(r'-?[0-9.]+', i)[-1] for i in a.split(',')]
