
import time

class Timer:
    def __init__(self, verbose=False, messagelen=20):
        now = time.time()
        self.times = [(now, now, "", [])]
        self.subtimes = []
        self.verbose = verbose
        self.messagelen = messagelen
    def duration_ms(self, entry):
        return int((entry[1] - entry[0]) * 1000)
    def print_message(self, message, time_ms):
        print "{{:{}}} {{:8}}ms".format(self.messagelen).format(message, time_ms)
    def measure(self, message):
        if len(message) > self.messagelen:
            self.messagelen = len(message) + 10
        now = time.time()
        self.times.append((self.times[-1][1], now, message, self.subtimes))
        self.subtimes = []
        if self.verbose:
            self.print_message(message, self.duration_ms(self.times[-1]))
    def submeasure(self, message):
        message = "    " + message
        if len(message) > self.messagelen:
            self.messagelen = len(message) + 10
        now = time.time()
        if self.subtimes:
            self.subtimes.append((self.subtimes[-1][1], now, message))
        else:
            self.subtimes.append((self.times[-1][1], now, message))
        if self.verbose:
            self.print_message(message, self.duration_ms(self.subtimes[-1]))
    def print_all(self):
        for t in self.times[1:]:
            begin, end, message, subtimes = t
            self.print_message(message, self.duration_ms(t))
            for st in subtimes:
                sbegin, send, smessage = st
                self.print_message(message, self.duration_ms(st))
    def full_duration(self):
        return self.times[-1][1] - self.times[0][0]
